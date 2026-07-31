import { describe, expect, it } from 'vitest';
import { NameIndex, NameIndexMatcher, normalizeName, weightedSimilarity } from './name-index';
import { RecognitionEvidence } from './models';

const index:NameIndex={schemaVersion:1,sourceUpdatedAt:'2026-01-01',identityCount:5,aliasCount:8,identities:[
  {identityId:'sun',oracleId:'sun',representativeId:'1',canonicalName:'Sun Titan',aliases:[{name:'Sun Titan',language:'en'},{name:'Titano Solare',language:'it'}]},
  {identityId:'fire',oracleId:'fire',representativeId:'2',canonicalName:'Fire // Ice',aliases:[{name:'Fire // Ice',language:'en'},{name:'Fire',language:'en'},{name:'Ice',language:'en'}]},
  {identityId:'one',representativeId:'3',canonicalName:'One',aliases:[{name:'One',language:'en'}]},
  {identityId:'same-a',representativeId:'4',canonicalName:'Echo',aliases:[{name:'Eco',language:'it'}]},
  {identityId:'same-b',representativeId:'5',canonicalName:'Eco',aliases:[{name:'Eco',language:'it'}]},
]};
const evidence=(...names:string[]):RecognitionEvidence=>({bestHints:{name:names[0]},observations:names.map((name,index)=>({region:'title',variant:(['grayscale','clahe','otsu','adaptive'] as const)[index%4],group:(['grayscale','clahe','otsu','adaptive'] as const)[index%4],text:name,confidence:80,hints:{name}}))});

describe('NameIndexMatcher',()=>{
  const matcher=new NameIndexMatcher(index);
  it('normalizes accents and discounts OCR confusions',()=>{expect(normalizeName('Éco!')).toBe('eco');expect(weightedSimilarity('So1are','Solare')).toBeGreaterThan(.9);});
  it('identifies a unique exact Italian alias and proposes its language',()=>{const result=matcher.match(evidence('Titano Solare'));expect(result.status).toBe('identified');if(result.status==='identified')expect(result.candidate.proposedLanguage).toBe('it');});
  it('uses agreement between variants for a fuzzy identification',()=>{const result=matcher.match(evidence('Titano Soiare','Titano Soiare'));expect(result.status).toBe('identified');});
  it('does not fuzzy-match short names',()=>expect(matcher.match(evidence('Onf')).status).not.toBe('identified'));
  it('keeps homonymous exact aliases ambiguous',()=>{const result=matcher.match(evidence('Eco'));expect(result.status).toBe('ambiguous');if(result.status==='ambiguous')expect(result.candidates).toHaveLength(2);});
  it('maps a face name to the multiface identity',()=>{const result=matcher.match(evidence('Fire'));expect(result.status).toBe('identified');if(result.status==='identified')expect(result.candidate.identityId).toBe('fire');});
  it('returns unmatched below threshold',()=>expect(matcher.match(evidence('Completely unrelated')).status).toBe('unmatched'));
});
