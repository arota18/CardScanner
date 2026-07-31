import { Injectable } from '@angular/core';
import { AutomaticCatalogResult, RecognitionEvidence } from './models';

@Injectable({providedIn:'root'})
export class NameIndexService{
  private worker?:Worker;private loading?:Promise<void>;private request=0;private pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
  match(evidence:RecognitionEvidence,signal?:AbortSignal):Promise<AutomaticCatalogResult>{return this.load().then(()=>this.call('match',evidence,signal));}
  private load():Promise<void>{return this.loading??=(async()=>{const response=await fetch('/catalogs/magic/name-index.v1.json',{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Indice nomi non disponibile.');this.worker=new Worker(new URL('./name-index.worker',import.meta.url),{type:'module'});this.worker.onmessage=event=>{const pending=this.pending.get(event.data.id);if(!pending)return;this.pending.delete(event.data.id);event.data.error?pending.reject(new Error(event.data.error)):pending.resolve(event.data.result);};this.worker.onerror=()=>{for(const pending of this.pending.values())pending.reject(new Error('Worker indice nomi non disponibile.'));this.pending.clear();};await this.call('load',await response.json());})();}
  private call<T>(type:string,payload:unknown,signal?:AbortSignal):Promise<T>{return new Promise((resolve,reject)=>{signal?.throwIfAborted();if(!this.worker){reject(new Error('Worker indice nomi non disponibile.'));return;}const id=++this.request;const abort=()=>{this.pending.delete(id);reject(signal?.reason??new DOMException('Annullato','AbortError'));};signal?.addEventListener('abort',abort,{once:true});this.pending.set(id,{resolve:value=>{signal?.removeEventListener('abort',abort);resolve(value);},reject:error=>{signal?.removeEventListener('abort',abort);reject(error);}});this.worker.postMessage({id,type,payload});});}
}
