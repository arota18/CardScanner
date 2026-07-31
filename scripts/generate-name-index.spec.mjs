import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildIndex, parseBulkMetadata } from './generate-name-index.mjs';

test('accepts direct and collection bulk metadata', () => {
  assert.deepEqual(parseBulkMetadata({type:'all_cards',jsonl_download_uri:'https://data.example/all.jsonl',updated_at:'2026-01-01'}),{downloadUri:'https://data.example/all.jsonl',sourceUpdatedAt:'2026-01-01',format:'jsonl'});
  assert.deepEqual(parseBulkMetadata({data:[{type:'all_cards',download_uri:'https://data.example/all.json'}]},new Headers({date:'Fri, 31 Jul 2026 00:00:00 GMT'})),{downloadUri:'https://data.example/all.json',sourceUpdatedAt:'Fri, 31 Jul 2026 00:00:00 GMT',format:'json'});
  assert.throws(()=>parseBulkMetadata({data:[]}),/nessuna voce all_cards/);
});

test('streams the new JSON Lines bulk format', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'index-test-')); const file = join(dir, 'bulk.jsonl');
  await writeFile(file, `${JSON.stringify({id:'it',oracle_id:'oracle',name:'Sun Titan',printed_name:'Titano Solare',lang:'it',games:['paper']})}\n${JSON.stringify({id:'digital',name:'Digital',lang:'en',games:['arena']})}\n`);
  try { const result = await buildIndex(file, '2026-01-01', 'jsonl'); assert.equal(result.identityCount, 1); assert.equal(result.aliasCount, 2); }
  finally { await rm(dir, { recursive:true, force:true }); }
});

test('filters, deduplicates faces and sorts deterministically', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'index-test-')); const file = join(dir, 'bulk.json');
  const cards = [
    { id:'z', oracle_id:'o2', name:'Fire // Ice', lang:'en', games:['paper'], card_faces:[{name:'Fire'},{name:'Ice'}] },
    { id:'a', oracle_id:'o1', name:'Sun Titan', printed_name:'Titano Solare', lang:'it', games:['paper'] },
    { id:'b', oracle_id:'o1', name:'Sun Titan', lang:'en', games:['paper'] },
    { id:'digital', oracle_id:'o3', name:'Digital', lang:'en', games:['arena'] },
    { id:'fr', oracle_id:'o4', name:'Français', lang:'fr', games:['paper'] },
    { id:'token', oracle_id:'o5', name:'Soldier', lang:'en', games:['paper'], layout:'token' },
  ];
  await writeFile(file, JSON.stringify(cards));
  try {
    const result = await buildIndex(file, '2026-01-01T00:00:00Z');
    assert.equal(result.identityCount, 3); assert.equal(result.aliasCount, 6);
    assert.deepEqual(result.identities.map(value => value.identityId), ['o1','o2','o5']);
    assert.deepEqual(result.identities[0].aliases, [{name:'Sun Titan',language:'en'},{name:'Titano Solare',language:'it'}]);
    assert.equal(result.sourceUpdatedAt, '2026-01-01T00:00:00Z');
  } finally { await rm(dir, { recursive:true, force:true }); }
});

test('rejects malformed and empty inputs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'index-test-'));
  try {
    const malformed=join(dir,'bad.json'), empty=join(dir,'empty.json');
    await writeFile(malformed, '[{"id":'); await writeFile(empty, '[]');
    await assert.rejects(buildIndex(malformed, 'now'), /non valido/);
    await assert.rejects(buildIndex(empty, 'now'), /vuoto/);
  } finally { await rm(dir, { recursive:true, force:true }); }
});
