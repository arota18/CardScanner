import { Injectable } from '@angular/core';
import { AutomaticCatalogResult, CatalogCard, Finish, IdentityCandidate, RecognitionEvidence } from './models';
import { NameIndexService } from './name-index.service';

export interface CatalogPage { cards: CatalogCard[]; hasMore: boolean; nextPage?: string }
export interface PrintingFilters { language?: string; setCode?: string }
export interface CatalogAdapter {
  automatic(evidence: RecognitionEvidence, signal?: AbortSignal): Promise<AutomaticCatalogResult>;
  printings(identity: IdentityCandidate, filters?: PrintingFilters, page?: string, signal?: AbortSignal): Promise<CatalogPage>;
  manual(query: string, page?: string, signal?: AbortSignal): Promise<CatalogPage>;
  resolve(id: string, signal?: AbortSignal): Promise<CatalogCard>;
}

interface ScryfallList { data: ScryfallCard[]; has_more: boolean; next_page?: string }
interface ScryfallCard {
  id: string; name: string; set: string; set_name: string; collector_number: string;
  rarity: string; lang: string; finishes: string[]; promo?: boolean; full_art?: boolean;
  oracle_id?: string; printed_name?: string;
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
  constructor(private readonly names: NameIndexService) {}

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

  async automatic(evidence: RecognitionEvidence, signal?: AbortSignal): Promise<AutomaticCatalogResult> {
    try { return await this.names.match(evidence, signal); }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw error; return this.liveAutomatic(evidence, signal); }
  }

  private async liveAutomatic(evidence: RecognitionEvidence, signal?: AbortSignal): Promise<AutomaticCatalogResult> {
    const filters = ['include:extras', 'include:multilingual', 'game:paper'];
    const titles = evidence.observations.filter(o => o.hints.name).map(o => ({ name: o.hints.name!, confidence: o.confidence }));
    const searches: string[][] = [];
    const queryKeys = new Set<string>();
    for (const hints of [...titles].sort((a,b) => b.confidence-a.confidence)) {
      const parts = [...filters, hints.name]; const key = normalized(parts.join(' '));
      if (!queryKeys.has(key)) { queryKeys.add(key); searches.push(parts); }
    }
    if (!searches.length) return {status:'unmatched',source:'live'};
    const found = new Map<string, ScryfallCard>();
    for (const parts of searches) {
      try {
        const page = await this.get<ScryfallList>(`https://api.scryfall.com/cards/search?unique=prints&q=${encodeURIComponent(parts.join(' '))}`, signal);
        page.data.forEach((card) => found.set(card.id, card));
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'Nessun risultato.') throw error;
      }
    }
    const identities=new Map<string,IdentityCandidate>();
    for(const card of found.values()){const score=Math.max(0,...titles.map(item=>similarity(card.printed_name??card.name,item.name)));const key=card.oracle_id??`scryfall:${card.id}`,candidate:IdentityCandidate={identityId:key,oracleId:card.oracle_id,representativeId:card.id,canonicalName:card.name,displayName:card.printed_name??card.name,proposedLanguage:card.lang==='it'?'it':'en',score,strength:'weak'};const current=identities.get(key);if(!current||current.score<score)identities.set(key,candidate);}
    const candidates=[...identities.values()].sort((a,b)=>b.score-a.score||a.identityId.localeCompare(b.identityId)).slice(0,5);
    if(!candidates.length||candidates[0].score<.70)return{status:'unmatched',source:'live'};
    const exact=candidates.filter(candidate=>titles.some(item=>normalized(item.name)===normalized(candidate.displayName)));
    if(exact.length===1)return{status:'identified',candidate:{...exact[0],score:1,strength:'strong'},source:'live'};
    return{status:'ambiguous',candidates,source:'live'};
  }

  async printings(identity:IdentityCandidate,filters:PrintingFilters={},page?:string,signal?:AbortSignal):Promise<CatalogPage>{
    if(!identity.oracleId){const card=await this.resolve(identity.representativeId,signal);return{cards:[card],hasMore:false};}
    const clauses=[`oracleid:${identity.oracleId}`,'game:paper','include:extras','include:multilingual'];
    if(filters.language)clauses.push(`lang:${filters.language}`);if(filters.setCode)clauses.push(`set:${filters.setCode}`);
    const url=page??`https://api.scryfall.com/cards/search?unique=prints&order=released&dir=desc&q=${encodeURIComponent(clauses.join(' '))}`;
    const result=await this.get<ScryfallList>(url,signal);return{cards:result.data.map(mapCard),hasMore:result.has_more,nextPage:result.next_page};
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
