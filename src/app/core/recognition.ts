import { Injectable } from '@angular/core';
import { createWorker, PSM, Worker } from 'tesseract.js';
import { RecognitionHints } from './models';

export interface QualityResult { brightness: number; sharpness: number; acceptable: boolean; reasons: string[] }
export interface Region { x: number; y: number; width: number; height: number }
export interface RecognitionResult {
  text: string;
  titleText: string;
  detailsText: string;
  hints: RecognitionHints;
}

export const MAGIC_REGIONS = {
  title: { x: .035, y: .025, width: .93, height: .14 },
  details: { x: .035, y: .84, width: .93, height: .14 },
} as const satisfies Record<string, Region>;

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

export function parseMagicText(titleText: string, detailsText: string): RecognitionHints {
  const name = clean(titleText).replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+|[^A-Za-zÀ-ÖØ-öø-ÿ0-9'’,: -]+$/g, '').trim();
  const collector = detailsText.match(/\b(\d{1,4}[a-z]?)(?:\s*\/\s*\d{1,4})?\b/i);
  const setBeforeNumber = detailsText.match(/\b([A-Z0-9]{3,5})\s+[·•|]?\s*\d{1,4}[a-z]?\b/i);
  const setAfterNumber = detailsText.match(/\b\d{1,4}[a-z]?\s+[·•|]?\s*([A-Z0-9]{3,5})\b/i);
  return {
    name: name || undefined,
    collectorNumber: collector?.[1],
    setCode: (setBeforeNumber?.[1] ?? setAfterNumber?.[1])?.toUpperCase(),
  };
}

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

  async recognize(image: Blob): Promise<RecognitionResult> {
    this.worker ??= createWorker(['ita', 'eng'], undefined, {
      workerPath: '/ocr/worker.min.js', corePath: '/ocr/tesseract-core.wasm.js', langPath: '/ocr/lang',
    });
    const bitmap = await createImageBitmap(image);
    try {
      const title = await this.crop(bitmap, MAGIC_REGIONS.title);
      const details = await this.crop(bitmap, MAGIC_REGIONS.details);
      const worker = await this.worker;
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, preserve_interword_spaces: '1' });
      const titleResult = await worker.recognize(title);
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' });
      const detailsResult = await worker.recognize(details);
      const titleText = clean(titleResult.data.text);
      const detailsText = clean(detailsResult.data.text);
      return {
        text: [titleText, detailsText].filter(Boolean).join('\n'),
        titleText,
        detailsText,
        hints: parseMagicText(titleText, detailsText),
      };
    } finally {
      bitmap.close();
    }
  }

  private async crop(source: ImageBitmap, region: Region): Promise<Blob> {
    const sx = Math.round(source.width * region.x);
    const sy = Math.round(source.height * region.y);
    const sw = Math.round(source.width * region.width);
    const sh = Math.round(source.height * region.height);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = sw * scale;
    canvas.height = sh * scale;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas OCR non disponibile.');
    context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = .2126 * pixels.data[i] + .7152 * pixels.data[i + 1] + .0722 * pixels.data[i + 2];
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = contrasted;
    }
    context.putImageData(pixels, 0, 0);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Ritaglio OCR non riuscito.')), 'image/png'));
  }

  async destroy(): Promise<void> {
    if (this.worker) await (await this.worker).terminate();
    this.worker = undefined;
  }
}
