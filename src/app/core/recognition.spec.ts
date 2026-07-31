import { describe, expect, it } from 'vitest';
import { MAGIC_REGIONS, RecognitionEngine, chooseDiagnostic, parseMagicText } from './recognition';

describe('RecognitionEngine quality', () => {
  it('rifiuta un frame buio e uniforme', () => {
    const result = new RecognitionEngine().quality({ data: new Uint8ClampedArray(4 * 100), width: 10, height: 10, colorSpace: 'srgb' } as ImageData);
    expect(result.acceptable).toBe(false);
    expect(result.reasons).toContain('Foto troppo scura');
  });
});

describe('OCR evidence', () => {
  it('prefers complete evidence, then confidence, for diagnostics', () => {
    const base={region:'details' as const,group:'otsu' as const};
    const chosen=chooseDiagnostic([
      {...base,variant:'otsu',text:'123',confidence:99,hints:{collectorNumber:'123'}},
      {...base,variant:'adaptive',group:'adaptive',text:'LCI 123',confidence:70,hints:{setCode:'LCI',collectorNumber:'123'}},
    ]);
    expect(chosen?.text).toBe('LCI 123');
  });
});

describe('Magic OCR regions and parsing', () => {
  it('keeps title and printing details in separate non-overlapping regions', () => {
    expect(MAGIC_REGIONS.title.y + MAGIC_REGIONS.title.height).toBeLessThan(MAGIC_REGIONS.details.y);
    for (const region of Object.values(MAGIC_REGIONS)) {
      expect(region.x).toBeGreaterThanOrEqual(0);
      expect(region.y).toBeGreaterThanOrEqual(0);
      expect(region.x + region.width).toBeLessThanOrEqual(1);
      expect(region.y + region.height).toBeLessThanOrEqual(1);
    }
  });

  it('extracts a Magic title, set code and collector number', () => {
    expect(parseMagicText('  Island  ', 'Land · LCI  396/291 EN')).toEqual({
      name: 'Island',
      setCode: 'LCI',
      collectorNumber: '396',
    });
  });

  it('does not invent fields from empty OCR regions', () => {
    expect(parseMagicText(' !!! ', 'copyright Wizards')).toEqual({
      name: undefined,
      setCode: undefined,
      collectorNumber: undefined,
    });
  });
});
