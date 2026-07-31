import { Injectable } from '@angular/core';
import { createWorker, PSM } from 'tesseract.js';
import type { Worker as TesseractWorker } from 'tesseract.js';
import { CardGeometry, OcrObservation, OcrVariant, RecognitionEvidence, RecognitionHints, Region } from './models';

export interface QualityResult { brightness:number; sharpness:number; acceptable:boolean; reasons:string[] }
export interface RecognitionResult extends RecognitionEvidence { text:string; titleText:string; detailsText:string; hints:RecognitionHints; geometry:CardGeometry }
export type RecognitionPhase = 'Rilevamento'|'Rettifica'|'Lettura';
export const MAGIC_REGIONS={title:{x:.035,y:.025,width:.93,height:.14},details:{x:.035,y:.84,width:.93,height:.14}} as const satisfies Record<string,Region>;
const VARIANTS:OcrVariant[]=['grayscale','clahe','otsu','adaptive'];
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();

export function parseMagicText(titleText:string,detailsText:string):RecognitionHints{
  const name=clean(titleText).replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+|[^A-Za-zÀ-ÖØ-öø-ÿ0-9'’,: -]+$/g,'').trim();
  const collector=detailsText.match(/\b(\d{1,4}[a-z]?)(?:\s*\/\s*\d{1,4})?\b/i);
  const setBefore=detailsText.match(/\b([A-Z0-9]{3,5})\s+[·•|]?\s*\d{1,4}[a-z]?\b/i),setAfter=detailsText.match(/\b\d{1,4}[a-z]?\s+[·•|]?\s*([A-Z0-9]{3,5})\b/i);
  return{name:name||undefined,collectorNumber:collector?.[1],setCode:(setBefore?.[1]??setAfter?.[1])?.toUpperCase()};
}

export function chooseDiagnostic(observations:readonly OcrObservation[]):OcrObservation|undefined{return [...observations].sort((a,b)=>{
  const completeness=(o:OcrObservation)=>Object.values(o.hints).filter(Boolean).length;
  return completeness(b)-completeness(a)||b.confidence-a.confidence||VARIANTS.indexOf(a.variant)-VARIANTS.indexOf(b.variant);
})[0];}

@Injectable({providedIn:'root'})
export class RecognitionEngine{
  private worker?:Promise<TesseractWorker>; private vision?:globalThis.Worker; private request=0;
  quality(data:ImageData):QualityResult{let brightness=0,edges=0;for(let i=0;i<data.data.length;i+=4){const lum=.2126*data.data[i]+.7152*data.data[i+1]+.0722*data.data[i+2];brightness+=lum;if(i>=4)edges+=Math.abs(lum-(.2126*data.data[i-4]+.7152*data.data[i-3]+.0722*data.data[i-2]));}const pixels=data.data.length/4,result={brightness:brightness/pixels,sharpness:edges/Math.max(1,pixels-1),acceptable:true,reasons:[] as string[]};if(result.brightness<55)result.reasons.push('Foto troppo scura');if(result.sharpness<5)result.reasons.push('Foto probabilmente sfocata');result.acceptable=!result.reasons.length;return result;}

  async recognize(image:Blob,guide:Region={x:.12,y:.05,width:.76,height:.9},signal?:AbortSignal,onPhase?:(phase:RecognitionPhase)=>void):Promise<RecognitionResult>{
    onPhase?.('Rilevamento'); const bitmap=await createImageBitmap(image); let source:ImageData;
    try{const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas OCR non disponibile.');ctx.drawImage(bitmap,0,0);source=ctx.getImageData(0,0,bitmap.width,bitmap.height);}finally{bitmap.close();}
    const processed=await this.preprocess(source,guide,signal,onPhase); signal?.throwIfAborted(); onPhase?.('Lettura');
    this.worker??=createWorker(['ita','eng'],undefined,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/tesseract-core.wasm.js',langPath:'/ocr/lang'});
    const ocr=await this.worker,observations:OcrObservation[]=[];
    for(const variant of VARIANTS){signal?.throwIfAborted();const card=processed.variants[variant];const title=await this.crop(card,MAGIC_REGIONS.title),details=await this.crop(card,MAGIC_REGIONS.details);
      await ocr.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE,preserve_interword_spaces:'1'});const tr=await ocr.recognize(title);
      await ocr.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,preserve_interword_spaces:'1'});const dr=await ocr.recognize(details);
      const titleText=clean(tr.data.text),detailsText=clean(dr.data.text),hints=parseMagicText(titleText,detailsText);
      observations.push({region:'title',variant,group:variant,text:titleText,confidence:tr.data.confidence,hints:{name:hints.name}},{region:'details',variant,group:variant,text:detailsText,confidence:dr.data.confidence,hints:{setCode:hints.setCode,collectorNumber:hints.collectorNumber}});
    }
    const title=chooseDiagnostic(observations.filter(o=>o.region==='title')),details=chooseDiagnostic(observations.filter(o=>o.region==='details'));
    const compatible=VARIANTS.map(v=>({v,h:parseMagicText(observations.find(o=>o.group===v&&o.region==='title')?.text??'',observations.find(o=>o.group===v&&o.region==='details')?.text??'')})).sort((a,b)=>Object.values(b.h).filter(Boolean).length-Object.values(a.h).filter(Boolean).length)[0]?.h??{};
    return{text:[title?.text,details?.text].filter(Boolean).join('\n'),titleText:title?.text??'',detailsText:details?.text??'',hints:compatible,bestHints:compatible,observations,geometry:processed.geometry};
  }
  private preprocess(image:ImageData,guide:Region,signal?:AbortSignal,onPhase?:(p:RecognitionPhase)=>void):Promise<{geometry:CardGeometry;variants:Record<OcrVariant,ImageData>}>{
    this.vision??=new Worker(new URL('./vision.worker',import.meta.url),{type:'module'});const id=++this.request;
    return new Promise((resolve,reject)=>{const abort=()=>{this.vision?.terminate();this.vision=undefined;reject(signal?.reason??new DOMException('Annullato','AbortError'));};signal?.addEventListener('abort',abort,{once:true});const listener=(event:MessageEvent)=>{if(event.data.id!==id)return;this.vision?.removeEventListener('message',listener);signal?.removeEventListener('abort',abort);if(event.data.error)reject(new Error(event.data.error));else{onPhase?.('Rettifica');resolve(event.data);}};this.vision!.addEventListener('message',listener);this.vision!.postMessage({id,image,guide},[image.data.buffer]);});
  }
  private async crop(source:ImageData,region:Region):Promise<Blob>{const sx=Math.round(source.width*region.x),sy=Math.round(source.height*region.y),sw=Math.round(source.width*region.width),sh=Math.round(source.height*region.height),canvas=new OffscreenCanvas(sw*2,sh*2),ctx=canvas.getContext('2d');if(!ctx)throw new Error('Ritaglio OCR non disponibile.');const full=new OffscreenCanvas(source.width,source.height),fctx=full.getContext('2d');if(!fctx)throw new Error('Canvas OCR non disponibile.');fctx.putImageData(source,0,0);ctx.drawImage(full,sx,sy,sw,sh,0,0,canvas.width,canvas.height);return canvas.convertToBlob({type:'image/png'});}
  async destroy():Promise<void>{this.vision?.terminate();this.vision=undefined;if(this.worker)await(await this.worker).terminate();this.worker=undefined;}
}
