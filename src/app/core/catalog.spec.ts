import { afterEach, describe, expect, it, vi } from 'vitest';
import { MagicScryfallAdapter } from './catalog';
import { IdentityCandidate, RecognitionEvidence } from './models';
import { NameIndexService } from './name-index.service';

const evidence:RecognitionEvidence={bestHints:{name:'Titano Solare'},observations:[{region:'title',variant:'otsu',group:'otsu',text:'Titano Solare',confidence:90,hints:{name:'Titano Solare'}}]};
const identity:IdentityCandidate={identityId:'oracle',oracleId:'oracle',representativeId:'card',canonicalName:'Sun Titan',displayName:'Titano Solare',proposedLanguage:'it',score:1,strength:'strong'};
const card={id:'printing',oracle_id:'oracle',name:'Sun Titan',printed_name:'Titano Solare',set:'m11',set_name:'Magic 2011',collector_number:'35',rarity:'mythic',lang:'it',finishes:['nonfoil'],games:['paper']};
afterEach(()=>vi.unstubAllGlobals());

describe('MagicScryfallAdapter',()=>{
  it('returns the local automatic result without a live request',async()=>{const names={match:vi.fn().mockResolvedValue({status:'identified',candidate:identity,source:'index'})} as unknown as NameIndexService;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect((await new MagicScryfallAdapter(names).automatic(evidence)).status).toBe('identified');expect(fetch).not.toHaveBeenCalled();});
  it('falls back to live search when the index cannot load',async()=>{const names={match:vi.fn().mockRejectedValue(new Error('missing'))} as unknown as NameIndexService;vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[card],has_more:false}),{status:200})));const result=await new MagicScryfallAdapter(names).automatic(evidence);expect(result.source).toBe('live');expect(result.status).toBe('identified');});
  it('paginates physical printings with identity and filters',async()=>{const names={} as NameIndexService;const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[card],has_more:true,next_page:'https://next'}),{status:200}));vi.stubGlobal('fetch',fetch);const result=await new MagicScryfallAdapter(names).printings(identity,{language:'it',setCode:'m11'});const url=String(fetch.mock.calls[0][0]);expect(decodeURIComponent(url)).toContain('oracleid:oracle game:paper');expect(decodeURIComponent(url)).toContain('lang:it set:m11');expect(url).toContain('order=released&dir=desc');expect(result.nextPage).toBe('https://next');expect(result.cards[0].catalogId).toBe('printing');});
});
