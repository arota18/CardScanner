import { Injectable } from '@angular/core';
import { Candidate, CatalogCard, Finish, RecognitionHints } from './models';

export interface CatalogPage { cards: CatalogCard[]; hasMore: boolean; nextPage?: string }
export interface CatalogAdapter {
  automatic(hints: RecognitionHints, signal?: AbortSignal): Promise<Candidate[]>;
  manual(query: string, page?: string, signal?: AbortSignal): Promise<CatalogPage>;
  resolve(id: string, signal?: AbortSignal): Promise<CatalogCard>;
}

interface ScryfallList { data: ScryfallCard[]; has_more: boolean; next_page?: string }
interface ScryfallCard {
  id: string; name: string; set: string; set_name: string; collector_number: string;
  rarity: string; lang: string; finishes: string[]; promo?: boolean; full_art?: boolean;
  printed_name?: string;
  frame_effects?: string[]; image_uris?: { normal?: string }; card_faces?: { image_uris?: { normal?: string } }[];
}

const normalized = (s = '') => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
const similarity = (a = '', b = ''): number => {
  const aa = normalized(a);
  const bb = normalized(b);
  if (!aa || !bb) return 0;
  const previous = Array.from({ length: bb.length + 1 }, (_, index) => index);
  for (let i = 1; i <= aa.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= bb.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + +(aa[i - 1] !== bb[j - 1]));
      diagonal = above;
    }
  }
  return 1 - previous[bb.length] / Math.max(aa.length, bb.length);
};
const finishes = (values: string[]): Finish[] => values.map((v): Finish =>
  v === 'nonfoil' ? 'Normal' : v === 'foil' ? 'Foil' : v === 'etched' ? 'Etched' : 'Other');
const variant = (card: ScryfallCard): string => {
  const labels: string[] = [];
  if (card.promo) labels.push('Promo');
  if (card.full_art) labels.push('Full art');
  if (card.frame_effects?.includes('showcase')) labels.push('Showcase');
  if (card.frame_effects?.includes('extendedart')) labels.push('Extended art');
  return labels.join('; ');
};
const mapCard = (card: ScryfallCard): CatalogCard => ({
  catalogSource: 'Scryfall', catalogId: card.id, name: card.printed_name ?? card.name, setCode: card.set.toUpperCase(),
  setName: card.set_name, collectorNumber: card.collector_number, rarity: card.rarity,
  printingVariant: variant(card), language: card.lang || 'Unknown', availableFinishes: finishes(card.finishes),
  imageUrl: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal,
});

@Injectable({ providedIn: 'root' })
export class MagicScryfallAdapter implements CatalogAdapter {
  private readonly cache = new Map<string, unknown>();
  private queue: Promise<void> = Promise.resolve();
  private lastRequest = 0;

  private async get<T>(url: string, signal?: AbortSignal): Promise<T> {
    if (this.cache.has(url)) return this.cache.get(url) as T;
    let release!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>((resolve) => release = resolve);
    await previous;
    const wait = Math.max(0, 120 - (Date.now() - this.lastRequest));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastRequest = Date.now();
    try {
      const timeout = AbortSignal.timeout(10_000);
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
      const response = await fetch(url, { signal: combined, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(response.status === 404 ? 'Nessun risultato.' : 'Catalogo non disponibile.');
      const data = await response.json() as T;
      this.cache.set(url, data);
      return data;
    } finally { release(); }
  }

  async automatic(hints: RecognitionHints, signal?: AbortSignal): Promise<Candidate[]> {
    const filters = ['include:extras', 'include:multilingual', 'game:paper'];
    const searches: string[][] = [];
    if (hints.setCode && hints.collectorNumber) searches.push([...filters, `set:${hints.setCode}`, `cn:${hints.collectorNumber}`]);
    if (hints.name) searches.push([...filters, hints.name]);
    if (!searches.length) return [];
    const found = new Map<string, ScryfallCard>();
    for (const parts of searches) {
      try {
        const page = await this.get<ScryfallList>(`https://api.scryfall.com/cards/search?unique=prints&q=${encodeURIComponent(parts.join(' '))}`, signal);
        page.data.forEach((card) => found.set(card.id, card));
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'Nessun risultato.') throw error;
      }
    }
    return [...found.values()].map(mapCard).map((card) => {
      const nameSimilarity = similarity(card.name, hints.name);
      const rank = [
        +(normalized(card.setCode) === normalized(hints.setCode) && normalized(card.collectorNumber) === normalized(hints.collectorNumber)),
        +(normalized(card.collectorNumber) === normalized(hints.collectorNumber)),
        +(normalized(card.name) === normalized(hints.name)),
        +(normalized(card.language) === normalized(hints.language)),
        nameSimilarity,
        card.catalogId,
      ] as const;
      return { ...card, rank, strong: rank[0] === 1 || rank[2] === 1 || nameSimilarity >= .8 };
    }).sort((a, b) => {
      for (let i = 0; i < 5; i++) { const delta = Number(b.rank[i]) - Number(a.rank[i]); if (delta) return delta; }
      return a.catalogId.localeCompare(b.catalogId);
    }).slice(0, 5);
  }

  async manual(query: string, page?: string, signal?: AbortSignal): Promise<CatalogPage> {
    const url = page ?? `https://api.scryfall.com/cards/search?unique=prints&q=${encodeURIComponent(`${query} include:extras include:multilingual game:paper`)}`;
    const result = await this.get<ScryfallList>(url, signal);
    return { cards: result.data.map(mapCard), hasMore: result.has_more, nextPage: result.next_page };
  }

  async resolve(id: string, signal?: AbortSignal): Promise<CatalogCard> {
    return mapCard(await this.get<ScryfallCard>(`https://api.scryfall.com/cards/${encodeURIComponent(id)}`, signal));
  }
}
