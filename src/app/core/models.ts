export const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'] as const;
export const FINISHES = ['Normal', 'Foil', 'Holo', 'Reverse Holo', 'Etched', 'Other', 'Unknown'] as const;
export type Condition = typeof CONDITIONS[number];
export type Finish = typeof FINISHES[number];
export type Game = 'Magic: The Gathering';

export interface SessionDefaults {
  condition: Condition;
  finish: Finish;
  storageLocation: string;
}

export interface Session {
  id: string;
  status: 'active' | 'terminated';
  game: Game;
  defaults: SessionDefaults;
  createdAt: string;
  endedAt?: string;
  schemaVersion: 1;
}

export interface CatalogCard {
  catalogSource: 'Scryfall';
  catalogId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  printingVariant: string;
  language: string;
  availableFinishes: Finish[];
  imageUrl?: string;
}

export type CatalogLanguage = 'it' | 'en';
export interface IdentityCandidate {
  identityId: string;
  oracleId?: string;
  representativeId: string;
  canonicalName: string;
  displayName: string;
  proposedLanguage: CatalogLanguage;
  score: number;
  strength: 'strong' | 'weak';
}
export type AutomaticCatalogResult =
  | { status: 'identified'; candidate: IdentityCandidate; source: 'index' | 'live' }
  | { status: 'ambiguous'; candidates: IdentityCandidate[]; source: 'index' | 'live' }
  | { status: 'unmatched'; source: 'index' | 'live' };

export interface CardRecord {
  id: string;
  sessionId: string;
  catalog: CatalogCard;
  language: string;
  finish: Finish;
  condition: Condition;
  storageLocation: string;
  registeredAt: string;
}

export interface RecognitionHints {
  language?: string;
  name?: string;
}

export interface Point { x: number; y: number }
export interface Region { x: number; y: number; width: number; height: number }
export interface CardGeometry {
  corners: readonly [Point, Point, Point, Point];
  sourceWidth: number;
  sourceHeight: number;
  canonicalWidth: 900;
  canonicalHeight: 1257;
  score: number;
}

export type OcrRegion = 'title';
export type OcrVariant = 'grayscale' | 'clahe' | 'otsu' | 'adaptive';
export interface OcrObservation {
  region: OcrRegion;
  variant: OcrVariant;
  text: string;
  confidence: number;
  hints: RecognitionHints;
  /** Identifies the preprocessing variant that produced this observation. */
  group: OcrVariant;
}
export interface RecognitionEvidence {
  observations: readonly OcrObservation[];
  bestHints: RecognitionHints;
}
