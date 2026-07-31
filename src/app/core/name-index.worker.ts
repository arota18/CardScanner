import { NameIndexMatcher } from './name-index';
let matcher:NameIndexMatcher|undefined;
addEventListener('message',(event:MessageEvent)=>{const{id,type,payload}=event.data;try{if(type==='load')matcher=new NameIndexMatcher(payload);else if(type==='match'){if(!matcher)throw new Error('Indice nomi non caricato.');postMessage({id,result:matcher.match(payload)});return;}postMessage({id,result:true});}catch(error){postMessage({id,error:error instanceof Error?error.message:'Indice nomi non valido.'});}});
