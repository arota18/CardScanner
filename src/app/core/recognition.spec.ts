import { describe, expect, it } from 'vitest';
import { RecognitionEngine } from './recognition';

describe('RecognitionEngine quality', () => {
  it('rifiuta un frame buio e uniforme', () => {
    const result = new RecognitionEngine().quality({ data: new Uint8ClampedArray(4 * 100), width: 10, height: 10, colorSpace: 'srgb' } as ImageData);
    expect(result.acceptable).toBe(false);
    expect(result.reasons).toContain('Foto troppo scura');
  });
});
