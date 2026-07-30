import { Injectable } from '@angular/core';
import { createWorker, Worker } from 'tesseract.js';
import { RecognitionHints } from './models';

export interface QualityResult { brightness: number; sharpness: number; acceptable: boolean; reasons: string[] }

@Injectable({ providedIn: 'root' })
export class RecognitionEngine {
  private worker?: Promise<Worker>;

  quality(data: ImageData): QualityResult {
    let brightness = 0;
    let edges = 0;
    for (let i = 0; i < data.data.length; i += 4) {
      const lum = .2126 * data.data[i] + .7152 * data.data[i + 1] + .0722 * data.data[i + 2];
      brightness += lum;
      if (i >= 4) edges += Math.abs(lum - (.2126 * data.data[i - 4] + .7152 * data.data[i - 3] + .0722 * data.data[i - 2]));
    }
    const pixels = data.data.length / 4;
    const result = { brightness: brightness / pixels, sharpness: edges / Math.max(1, pixels - 1), acceptable: true, reasons: [] as string[] };
    if (result.brightness < 55) result.reasons.push('Foto troppo scura');
    if (result.sharpness < 5) result.reasons.push('Foto probabilmente sfocata');
    result.acceptable = result.reasons.length === 0;
    return result;
  }

  async recognize(image: Blob): Promise<{ text: string; hints: RecognitionHints }> {
    this.worker ??= createWorker(['ita', 'eng'], undefined, {
      workerPath: '/ocr/worker.min.js', corePath: '/ocr/tesseract-core.wasm.js', langPath: '/ocr/lang',
    });
    const result = await (await this.worker).recognize(image);
    const text = result.data.text;
    const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const collector = text.match(/\b(?:[A-Z]{2,5}\s+)?(\d{1,4}[a-z]?)(?:\/\d{1,4})?\b/i);
    const set = text.match(/\b([A-Z0-9]{3,5})\s+\d{1,4}/);
    return { text, hints: { name: lines[0], collectorNumber: collector?.[1], setCode: set?.[1] } };
  }

  async destroy(): Promise<void> {
    if (this.worker) await (await this.worker).terminate();
    this.worker = undefined;
  }
}
