#!/usr/bin/env node
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SCHEMA_VERSION = 1;
export const OUTPUT_PATH = resolve('public/catalogs/magic/name-index.v1.json');

const text = value => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('en').replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();

/** Iterate objects in a top-level JSON array without retaining the bulk file. */
export async function* streamJsonArray(file) {
  const input = createReadStream(file, { encoding: 'utf8' });
  let started = false, ended = false, depth = 0, quoted = false, escaped = false, object = '';
  for await (const chunk of input) {
    for (const char of chunk) {
      if (!started) { if (/\s/.test(char)) continue; if (char !== '[') throw new Error('Bulk non valido: atteso un array JSON.'); started = true; continue; }
      if (ended) { if (!/\s/.test(char)) throw new Error('Bulk non valido: dati dopo la fine dell’array.'); continue; }
      if (!depth) {
        if (/\s|,/.test(char)) continue;
        if (char === ']') { ended = true; continue; }
        if (char !== '{') throw new Error('Bulk non valido: elemento non oggetto.');
        depth = 1; object = char; continue;
      }
      object += char;
      if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue; }
      if (char === '"') quoted = true;
      else if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') depth--;
      if (!depth) { let parsed; try { parsed = JSON.parse(object); } catch { throw new Error('Bulk non valido: oggetto JSON illeggibile.'); } yield parsed; object = ''; }
    }
  }
  if (!started || !ended || depth) throw new Error('Bulk non valido: array incompleto.');
}

export async function buildIndex(file, sourceUpdatedAt) {
  const identities = new Map();
  for await (const card of streamJsonArray(file)) {
    if (!Array.isArray(card.games) || !card.games.includes('paper') || !['it', 'en'].includes(card.lang)) continue;
    if (!text(card.id) || !text(card.name)) throw new Error('Schema Scryfall non valido: id o nome assente.');
    const identityId = text(card.oracle_id) ?? `scryfall:${card.id}`;
    let identity = identities.get(identityId);
    if (!identity) {
      identity = { identityId, oracleId: text(card.oracle_id), representativeId: card.id, canonicalName: card.name, aliases: new Map() };
      identities.set(identityId, identity);
    }
    if (card.id.localeCompare(identity.representativeId) < 0) identity.representativeId = card.id;
    if (card.lang === 'en' || !identity.canonicalName) identity.canonicalName = card.name;
    const add = (name, language) => { const value = text(name); if(value){const key=`${language}\0${normalize(value)}`,current=identity.aliases.get(key);if(!current||value.localeCompare(current.name,'en')<0)identity.aliases.set(key,{name:value,language});} };
    add(card.name, 'en');
    add(card.printed_name, card.lang);
    for (const face of Array.isArray(card.card_faces) ? card.card_faces : []) {
      add(face.name, 'en'); add(face.printed_name, card.lang);
    }
  }
  const outputIdentities = [...identities.values()].map(identity => ({
    identityId: identity.identityId,
    ...(identity.oracleId ? { oracleId: identity.oracleId } : {}),
    representativeId: identity.representativeId,
    canonicalName: identity.canonicalName,
    aliases: [...identity.aliases.values()].sort((a, b) => a.language.localeCompare(b.language) || a.name.localeCompare(b.name, 'en')),
  })).filter(identity => identity.aliases.length).sort((a, b) => a.identityId.localeCompare(b.identityId));
  const aliasCount = outputIdentities.reduce((sum, item) => sum + item.aliases.length, 0);
  if (!outputIdentities.length || !aliasCount) throw new Error('Indice Scryfall vuoto.');
  return { schemaVersion: SCHEMA_VERSION, sourceUpdatedAt, identityCount: outputIdentities.length, aliasCount, identities: outputIdentities };
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CardScanner name index generator' } });
  if (!response.ok || !response.body) throw new Error(`Download Scryfall fallito (${response.status}).`);
  const output = createWriteStream(destination);
  await response.body.pipeTo(new WritableStream({ write(chunk) { return new Promise((ok, fail) => output.write(chunk, error => error ? fail(error) : ok())); }, close() { return new Promise(ok => output.end(ok)); }, abort(error) { output.destroy(error); } }));
}

export async function generate(output = OUTPUT_PATH) {
  const temporary = await mkdtemp(join(tmpdir(), 'cardscanner-scryfall-'));
  try {
    const response = await fetch('https://api.scryfall.com/bulk-data', { headers: { Accept: 'application/json', 'User-Agent': 'CardScanner name index generator' } });
    if (!response.ok) throw new Error(`Metadati Scryfall non disponibili (${response.status}).`);
    const metadata = await response.json();
    const bulk = metadata?.data?.find(item => item.type === 'all_cards');
    if (!bulk?.download_uri || !bulk?.updated_at) throw new Error('Schema metadati Scryfall non valido.');
    const bulkFile = join(temporary, 'all-cards.json');
    await download(bulk.download_uri, bulkFile);
    const index = await buildIndex(bulkFile, bulk.updated_at);
    await mkdir(dirname(output), { recursive: true });
    const pending = `${output}.${process.pid}.tmp`;
    await new Promise((ok, fail) => { const stream = createWriteStream(pending, { encoding: 'utf8' }); stream.on('error', fail); stream.end(`${JSON.stringify(index)}\n`, ok); });
    await rename(pending, output);
    return index;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

async function main() {
  const ensureOnly = process.argv.includes('--if-missing');
  if (ensureOnly) { try { if ((await stat(OUTPUT_PATH)).size > 0) return; } catch {} }
  const index = await generate();
  console.log(`Indice Scryfall: ${index.identityCount} identità, ${index.aliasCount} alias.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
