import { AutomaticCatalogResult, CatalogLanguage, IdentityCandidate, RecognitionEvidence } from './models';

export interface NameIndexAlias { name: string; language: CatalogLanguage }
export interface NameIndexIdentity { identityId:string; oracleId?:string; representativeId:string; canonicalName:string; aliases:NameIndexAlias[] }
export interface NameIndex { schemaVersion:1; sourceUpdatedAt:string; identityCount:number; aliasCount:number; identities:NameIndexIdentity[] }

export const normalizeName=(value:string):string=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('en').replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim();
const confusion=(a:string,b:string):boolean=>['il1','o0','s5','b8'].some(group=>group.includes(a)&&group.includes(b));
export function weightedSimilarity(left:string,right:string):number{
  const a=normalizeName(left),b=normalizeName(right);if(!a||!b)return 0;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const current=[i];for(let j=1;j<=b.length;j++)current[j]=Math.min(previous[j]+1,current[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:confusion(a[i-1],b[j-1]) ? .25 : 1));previous=current;}
  return Math.max(0,1-previous[b.length]/Math.max(a.length,b.length));
}
const trigrams=(value:string):string[]=>{const normalized=`  ${normalizeName(value)}  `,out=[];for(let i=0;i<normalized.length-2;i++)out.push(normalized.slice(i,i+3));return out;};

export class NameIndexMatcher{
  private readonly exact=new Map<string,Set<number>>();private readonly trigram=new Map<string,Set<number>>();
  constructor(private readonly index:NameIndex){
    if(index.schemaVersion!==1||typeof index.sourceUpdatedAt!=='string'||!index.sourceUpdatedAt||!Number.isInteger(index.aliasCount)||!Array.isArray(index.identities)||!index.identities.length||index.identityCount!==index.identities.length)throw new Error('Indice nomi non valido.');
    let aliases=0;
    index.identities.forEach((identity,i)=>{if(!identity.identityId||!identity.representativeId||!identity.canonicalName||!identity.aliases?.length)throw new Error('Indice nomi non valido.');for(const alias of identity.aliases){if(!alias.name||!['it','en'].includes(alias.language))throw new Error('Indice nomi non valido.');aliases++;const key=normalizeName(alias.name);if(!this.exact.has(key))this.exact.set(key,new Set());this.exact.get(key)!.add(i);for(const gram of new Set(trigrams(alias.name))){if(!this.trigram.has(gram))this.trigram.set(gram,new Set());this.trigram.get(gram)!.add(i);}}});
    if(aliases!==index.aliasCount)throw new Error('Indice nomi non valido.');
  }
  match(evidence:RecognitionEvidence):AutomaticCatalogResult{
    const variants=evidence.observations.map(item=>item.hints.name?.trim()).filter((value):value is string=>!!value);if(!variants.length)return{status:'unmatched',source:'index'};
    const exactIds=new Set<number>();for(const value of variants)this.exact.get(normalizeName(value))?.forEach(id=>exactIds.add(id));
    if(exactIds.size===1)return{status:'identified',candidate:this.candidate([...exactIds][0],variants,1,'strong'),source:'index'};
    const pool=new Set<number>();for(const value of variants)for(const gram of new Set(trigrams(value)))this.trigram.get(gram)?.forEach(id=>pool.add(id));
    const scored=[...pool].map(id=>{const identity=this.index.identities[id];let score=0,best=identity.aliases[0],agreement=0;for(const value of variants){let variantScore=0;for(const alias of identity.aliases){const current=weightedSimilarity(value,alias.name);if(current>score){score=current;best=alias;}variantScore=Math.max(variantScore,current);}if(variantScore>=.88)agreement++;}return{id,score,best,agreement};}).sort((a,b)=>b.score-a.score||this.index.identities[a.id].identityId.localeCompare(this.index.identities[b.id].identityId));
    if(!scored.length||scored[0].score<.70)return{status:'unmatched',source:'index'};
    const top=scored[0],margin=top.score-(scored[1]?.score??0),short=variants.every(value=>normalizeName(value).length<=4);
    if(!short&&top.score>=.88&&margin>=.08&&top.agreement>=2)return{status:'identified',candidate:this.fromScore(top,'strong'),source:'index'};
    return{status:'ambiguous',candidates:scored.slice(0,5).map(item=>this.fromScore(item,'weak')),source:'index'};
  }
  private candidate(id:number,variants:string[],score:number,strength:'strong'|'weak'):IdentityCandidate{const identity=this.index.identities[id];let alias=identity.aliases[0],best=-1;for(const value of variants)for(const item of identity.aliases){const current=weightedSimilarity(value,item.name);if(current>best){best=current;alias=item;}}return{identityId:identity.identityId,oracleId:identity.oracleId,representativeId:identity.representativeId,canonicalName:identity.canonicalName,displayName:alias.name,proposedLanguage:alias.language,score,strength};}
  private fromScore(item:{id:number;score:number;best:NameIndexAlias},strength:'strong'|'weak'):IdentityCandidate{const identity=this.index.identities[item.id];return{identityId:identity.identityId,oracleId:identity.oracleId,representativeId:identity.representativeId,canonicalName:identity.canonicalName,displayName:item.best.name,proposedLanguage:item.best.language,score:item.score,strength};}
}
