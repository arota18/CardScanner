import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CardRecord, Session, SessionDefaults } from './models';
import { createUuid } from './uuid';

class CardScannerDb extends Dexie {
  sessions!: Table<Session, string>;
  records!: Table<CardRecord, string>;
  constructor() {
    super('cardscanner');
    this.version(1).stores({ sessions: 'id,status,createdAt', records: 'id,sessionId,registeredAt' });
  }
}

export interface StoredSession { session: Session; records: CardRecord[] }

@Injectable({ providedIn: 'root' })
export class SessionRepository {
  private readonly db = new CardScannerDb();

  async current(): Promise<StoredSession | undefined> {
    const session = (await this.db.sessions.orderBy('createdAt').last());
    return session ? { session, records: await this.db.records.where('sessionId').equals(session.id).sortBy('registeredAt') } : undefined;
  }

  async create(defaults: SessionDefaults, replace = false): Promise<StoredSession> {
    return this.db.transaction('rw', this.db.sessions, this.db.records, async () => {
      const old = await this.db.sessions.toArray();
      if (old.length && !replace) throw new Error('Conferma la cancellazione della sessione conservata.');
      if (replace) {
        await this.db.records.clear();
        await this.db.sessions.clear();
      }
      const session: Session = {
        id: createUuid(), status: 'active', game: 'Magic: The Gathering',
        defaults, createdAt: new Date().toISOString(), schemaVersion: 1,
      };
      await this.db.sessions.add(session);
      return { session, records: [] };
    });
  }

  async add(session: Session, record: Omit<CardRecord, 'id' | 'sessionId' | 'registeredAt'>): Promise<CardRecord> {
    if (session.status !== 'active') throw new Error('La sessione terminata è congelata.');
    const saved = { ...record, id: createUuid(), sessionId: session.id, registeredAt: new Date().toISOString() };
    await this.db.transaction('rw', this.db.sessions, this.db.records, async () => {
      const fresh = await this.db.sessions.get(session.id);
      if (fresh?.status !== 'active') throw new Error('La sessione terminata è congelata.');
      await this.db.records.add(saved);
    });
    return saved;
  }

  async update(session: Session, record: CardRecord): Promise<void> {
    if (session.status !== 'active') throw new Error('La sessione terminata è congelata.');
    await this.db.records.put(record);
  }

  async saveSession(session: Session): Promise<void> {
    if (session.status !== 'active') throw new Error('La sessione terminata è congelata.');
    await this.db.sessions.put(session);
  }

  async remove(session: Session, id: string): Promise<void> {
    if (session.status !== 'active') throw new Error('La sessione terminata è congelata.');
    await this.db.records.delete(id);
  }

  async terminate(session: Session): Promise<Session> {
    return this.db.transaction('rw', this.db.sessions, this.db.records, async () => {
      if (session.status !== 'active') return session;
      if (await this.db.records.where('sessionId').equals(session.id).count() === 0) throw new Error('Una sessione vuota non può essere terminata.');
      const result: Session = { ...session, status: 'terminated', endedAt: new Date().toISOString() };
      await this.db.sessions.put(result);
      return result;
    });
  }

  async discardEmpty(session: Session): Promise<void> {
    if (session.status !== 'active' || await this.db.records.where('sessionId').equals(session.id).count()) {
      throw new Error('Solo una sessione attiva e vuota può essere scartata.');
    }
    await this.db.sessions.delete(session.id);
  }

  requestPersistentStorage(): Promise<boolean> {
    return navigator.storage?.persist ? navigator.storage.persist() : Promise.resolve(false);
  }
}
