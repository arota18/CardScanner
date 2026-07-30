import { describe, expect, it } from 'vitest';
import { CsvExporter } from './csv-exporter';
import { CardRecord, Session } from './models';

describe('CsvExporter', () => {
  const session: Session = {
    id: 'session', status: 'terminated', game: 'Magic: The Gathering',
    defaults: { condition: 'Near Mint', finish: 'Normal', storageLocation: '' },
    createdAt: '2026-07-30T10:00:00.000Z', endedAt: '2026-07-30T11:00:00.123Z', schemaVersion: 1,
  };
  const record: CardRecord = {
    id: 'record', sessionId: session.id, language: 'it', finish: 'Foil',
    condition: 'Near Mint', storageLocation: 'Scaffale A, cassetto "Blu"',
    registeredAt: '2026-07-30T10:15:30.123Z',
    catalog: {
      catalogSource: 'Scryfall', catalogId: 'catalog-id', name: 'Raff, Weatherlight Stalwart',
      setCode: 'MUL', setName: 'Multiverse Legends', collectorNumber: '56', rarity: 'uncommon',
      printingVariant: 'Showcase', language: 'it', availableFinishes: ['Normal', 'Foil'],
    },
  };
  it('produce BOM, ordine stabile, escaping RFC 4180 e CRLF', () => {
    const bytes = new CsvExporter().serialize(session, [record]);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('Game,Card name,Set code')).toBe(true);
    expect(text).toContain('"Raff, Weatherlight Stalwart"');
    expect(text).toContain('"Scaffale A, cassetto ""Blu"""');
    expect(text.split('\r\n')).toHaveLength(3);
    expect(text.replaceAll('\r\n', '')).not.toContain('\n');
  });
  it('usa il termine stabile nel nome', () => {
    expect(new CsvExporter().filename(session)).toBe('cardscanner-magic-the-gathering-2026-07-30T11-00-00Z.csv');
  });
  it('rifiuta sessioni attive o vuote', () => {
    expect(() => new CsvExporter().serialize({ ...session, status: 'active', endedAt: undefined }, [record])).toThrow();
    expect(() => new CsvExporter().serialize(session, [])).toThrow();
  });
});
