import { Injectable } from '@angular/core';
import { CardRecord, Session } from './models';

export const CSV_COLUMNS = [
  'Game', 'Card name', 'Set code', 'Set name', 'Collector number', 'Rarity',
  'Printing variant', 'Finish', 'Language', 'Condition', 'Storage location',
  'Catalog source', 'Catalog ID', 'Scanned at',
] as const;

const escape = (value: string): string =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

@Injectable({ providedIn: 'root' })
export class CsvExporter {
  serialize(session: Session, records: readonly CardRecord[]): Uint8Array {
    if (session.status !== 'terminated' || !session.endedAt || records.length === 0) {
      throw new Error('È esportabile soltanto una sessione terminata e non vuota.');
    }
    const rows = records.map((record) => [
      session.game, record.catalog.name, record.catalog.setCode, record.catalog.setName,
      record.catalog.collectorNumber, record.catalog.rarity, record.catalog.printingVariant,
      record.finish, record.language || 'Unknown', record.condition, record.storageLocation,
      record.catalog.catalogSource, record.catalog.catalogId, record.registeredAt,
    ].map(escape).join(','));
    return new TextEncoder().encode(`\uFEFF${CSV_COLUMNS.join(',')}\r\n${rows.join('\r\n')}\r\n`);
  }

  filename(session: Session): string {
    if (!session.endedAt) throw new Error('La sessione non è terminata.');
    const stamp = session.endedAt.replace(/\.\d{3}Z$/, 'Z').replaceAll(':', '-');
    return `cardscanner-magic-the-gathering-${stamp}.csv`;
  }
}
