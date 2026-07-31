import { describe, expect, it } from 'vitest';
import { TITLE_REGION, RecognitionEngine, chooseDiagnostic, parseCardTitle } from './recognition';

describe('RecognitionEngine quality', () => {
  it('rifiuta un frame buio e uniforme', () => {
    const result = new RecognitionEngine().quality({ data: new Uint8ClampedArray(4 * 100), width: 10, height: 10, colorSpace: 'srgb' } as ImageData);
    expect(result.acceptable).toBe(false);
    expect(result.reasons).toContain('Foto troppo scura');
  });
});

describe('OCR evidence', () => {
  it('prefers a parsed title, then confidence, for diagnostics', () => {
    const base={region:'title' as const,group:'otsu' as const};
    const chosen=chooseDiagnostic([
      {...base,variant:'otsu',text:'!!!',confidence:99,hints:{}},
      {...base,variant:'adaptive',group:'adaptive',text:'Titano Solare',confidence:70,hints:{name:'Titano Solare'}},
    ]);
    expect(chosen?.text).toBe('Titano Solare');
  });
});

describe('title OCR region and parsing', () => {
  it('keeps the title crop inside the canonical card', () => {
    expect(TITLE_REGION.x).toBeGreaterThanOrEqual(0);
    expect(TITLE_REGION.y).toBeGreaterThanOrEqual(0);
    expect(TITLE_REGION.x + TITLE_REGION.width).toBeLessThanOrEqual(1);
    expect(TITLE_REGION.y + TITLE_REGION.height).toBeLessThanOrEqual(1);
  });

  it('extracts only the card title', () => {
    expect(parseCardTitle('  Titano Solare  ')).toEqual({name:'Titano Solare'});
  });

  it('does not invent a name from an empty OCR region', () => {
    expect(parseCardTitle(' !!! ')).toEqual({name:undefined});
  });
});
