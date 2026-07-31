#!/usr/bin/env node
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, open, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';

export const SCHEMA_VERSION = 1;
export const OUTPUT_PATH = resolve('public/catalogs/magic/name-index.v1.json');
export const BULK_METADATA_URL = 'https://api.scryfall.com/bulk-data/all_cards';

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

export async function* streamJsonLines(file) {
  const lines = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let lineNumber = 0, found = false;
  for await (const line of lines) {
    lineNumber++;
    if (!line.trim()) continue;
    found = true;
    try { yield JSON.parse(line); }
    catch { throw new Error(`Bulk JSONL non valido alla riga ${lineNumber}.`); }
  }
  if (!found) throw new Error('Bulk JSONL non valido: file vuoto.');
}

async function* streamCards(file) {
  const input = createReadStream(file, { encoding: 'utf8' });
  let firstCharacter;
  for await (const chunk of input) {
    firstCharacter = chunk.match(/\S/)?.[0];
    if (firstCharacter) break;
  }
  input.destroy();

  if (!firstCharacter) throw new Error('Bulk non valido: file vuoto.');
  if (firstCharacter === '[') yield* streamJsonArray(file);
  else if (firstCharacter === '{') yield* streamJsonLines(file);
  else throw new Error(`Bulk non valido: formato non riconosciuto (inizia con ${JSON.stringify(firstCharacter)}).`);
}

export async function buildIndex(file, sourceUpdatedAt) {
  const identities = new Map();
  for await (const card of streamCards(file)) {
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

export function parseBulkMetadata(metadata, responseHeaders = new Headers()) {
  const bulk = metadata?.type === 'all_cards'
    ? metadata
    : metadata?.data?.find?.(item => item?.type === 'all_cards');
  const jsonlDownloadUri = text(bulk?.jsonl_download_uri);
  const legacyDownloadUri = text(bulk?.download_uri);
  const downloadUri = jsonlDownloadUri ?? legacyDownloadUri;
  const sourceUpdatedAt = text(bulk?.updated_at)
    ?? text(bulk?.updatedAt)
    ?? text(responseHeaders.get('last-modified'))
    ?? text(responseHeaders.get('date'));
  if (!downloadUri || !sourceUpdatedAt) {
    const shape = Array.isArray(metadata?.data) ? 'collection' : typeof metadata;
    const keys = bulk && typeof bulk === 'object' ? Object.keys(bulk).sort().join(',') : 'nessuna voce all_cards';
    throw new Error(`Schema metadati Scryfall non valido (${shape}; campi: ${keys}).`);
  }
  return { downloadUri, sourceUpdatedAt, format: jsonlDownloadUri ? 'jsonl' : 'json' };
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CardScanner name index generator' } });
  if (!response.ok || !response.body) throw new Error(`Download Scryfall fallito (${response.status}).`);
  const output = createWriteStream(destination);
  await response.body.pipeTo(new WritableStream({ write(chunk) { return new Promise((ok, fail) => output.write(chunk, error => error ? fail(error) : ok())); }, close() { return new Promise(ok => output.end(ok)); }, abort(error) { output.destroy(error); } }));
}

export async function decompressBulkIfNeeded(file) {
  const handle = await open(file, 'r');
  const header = Buffer.alloc(2);
  let bytesRead;
  try { ({ bytesRead } = await handle.read(header, 0, header.length, 0)); }
  finally { await handle.close(); }
  if (bytesRead < 2 || header[0] !== 0x1f || header[1] !== 0x8b) return file;

  const decompressed = `${file}.decompressed`;
  await pipeline(createReadStream(file), createGunzip(), createWriteStream(decompressed));
  return decompressed;
}

export async function generate(output = OUTPUT_PATH) {
  const temporary = await mkdtemp(join(tmpdir(), 'cardscanner-scryfall-'));
  try {
    const response = await fetch(BULK_METADATA_URL, { headers: { Accept: 'application/json', 'User-Agent': 'CardScanner/1.0 (+https://github.com/arota18/CardScanner)' } });
    if (!response.ok) throw new Error(`Metadati Scryfall non disponibili (${response.status}).`);
    const metadata = await response.json();
    const { downloadUri, sourceUpdatedAt, format } = parseBulkMetadata(metadata, response.headers);
    const bulkFile = join(temporary, format === 'jsonl' ? 'all-cards.jsonl' : 'all-cards.json');
    await download(downloadUri, bulkFile);
    const readableBulkFile = await decompressBulkIfNeeded(bulkFile);
    const index = await buildIndex(readableBulkFile, sourceUpdatedAt, format);
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
