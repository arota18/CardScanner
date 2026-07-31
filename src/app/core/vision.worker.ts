/// <reference lib="webworker" />
import { CANONICAL_CARD, selectQuadrilateral } from './card-geometry';
import { CardGeometry, OcrVariant, Point, Region } from './models';

interface Request { id: number; image: ImageData; guide: Region }
interface Response { id: number; geometry?: CardGeometry; variants?: Record<OcrVariant, ImageData>; error?: string }
const clamp=(v:number)=>Math.max(0,Math.min(255,v));
const gray=(image:ImageData):Uint8ClampedArray=>{const out=new Uint8ClampedArray(image.width*image.height);for(let i=0,j=0;i<image.data.length;i+=4,j++)out[j]=.2126*image.data[i]+.7152*image.data[i+1]+.0722*image.data[i+2];return out};

function detect(image:ImageData, guide:Region):CardGeometry|undefined {
  const max=640, scale=Math.min(1,max/Math.max(image.width,image.height)), w=Math.round(image.width*scale),h=Math.round(image.height*scale),g=gray(image);
  const sample=(x:number,y:number)=>g[Math.min(image.height-1,Math.round(y/scale))*image.width+Math.min(image.width-1,Math.round(x/scale))];
  const strengths=[28,42,58]; const candidates:{corners:Point[]}[]=[];
  // A Magic card has a continuous dark outer frame. Projections suppress isolated
  // texture edges (fabric, wood grain) that would otherwise dominate extrema.
  for(const darkLimit of [55,70,85]){
    const rows=new Uint32Array(h),cols=new Uint32Array(w);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(sample(x,y)<darkLimit){rows[y]++;cols[x]++;}
    const activeRows=[...rows].map((count,index)=>({count,index})).filter(v=>v.count>w*.12).map(v=>v.index);
    const activeCols=[...cols].map((count,index)=>({count,index})).filter(v=>v.count>h*.12).map(v=>v.index);
    if(activeRows.length&&activeCols.length){
      const left=Math.min(...activeCols)/scale,right=Math.max(...activeCols)/scale,top=Math.min(...activeRows)/scale,bottom=Math.max(...activeRows)/scale;
      candidates.push({corners:[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}]});
    }
  }
  for(const threshold of strengths){
    const points:Point[]=[];
    for(let y=2;y<h-2;y+=2)for(let x=2;x<w-2;x+=2){const edge=Math.abs(sample(x+2,y)-sample(x-2,y))+Math.abs(sample(x,y+2)-sample(x,y-2));if(edge>threshold*2)points.push({x:x/scale,y:y/scale});}
    if(points.length<20)continue;
    // Extremal sums are stable for a perspective quadrilateral and reject uniform scenes.
    const minSum=points.reduce((a,b)=>a.x+a.y<b.x+b.y?a:b), maxSum=points.reduce((a,b)=>a.x+a.y>b.x+b.y?a:b);
    const minDiff=points.reduce((a,b)=>a.x-a.y<b.x-b.y?a:b), maxDiff=points.reduce((a,b)=>a.x-a.y>b.x-b.y?a:b);
    candidates.push({corners:[minSum,maxDiff,maxSum,minDiff]});
  }
  return selectQuadrilateral(candidates,image.width,image.height,guide);
}

function warp(image:ImageData, geometry:CardGeometry):ImageData {
  const {width,height}=CANONICAL_CARD,out=new ImageData(width,height),p=geometry.corners;
  // Bilinear quadrilateral mapping; unlike a crop it preserves all four detected corners.
  for(let y=0;y<height;y++){const v=y/(height-1);for(let x=0;x<width;x++){const u=x/(width-1);const sx=(1-u)*(1-v)*p[0].x+u*(1-v)*p[1].x+u*v*p[2].x+(1-u)*v*p[3].x;const sy=(1-u)*(1-v)*p[0].y+u*(1-v)*p[1].y+u*v*p[2].y+(1-u)*v*p[3].y;const si=(Math.max(0,Math.min(image.height-1,Math.round(sy)))*image.width+Math.max(0,Math.min(image.width-1,Math.round(sx))))*4,di=(y*width+x)*4;out.data[di]=image.data[si];out.data[di+1]=image.data[si+1];out.data[di+2]=image.data[si+2];out.data[di+3]=255;}}
  return out;
}
function makeImage(values:Uint8ClampedArray,w:number,h:number):ImageData{const result=new ImageData(w,h);for(let i=0;i<values.length;i++){const j=i*4;result.data[j]=result.data[j+1]=result.data[j+2]=values[i];result.data[j+3]=255;}return result}
function variants(image:ImageData):Record<OcrVariant,ImageData>{const src=gray(image), n=src.length, histogram=new Uint32Array(256);src.forEach(v=>histogram[v]++);let total=0;for(let i=0;i<256;i++)total+=i*histogram[i];let sum=0,weight=0,best=0,max=0;for(let i=0;i<256;i++){weight+=histogram[i];if(!weight)continue;const rest=n-weight;if(!rest)break;sum+=i*histogram[i];const between=weight*rest*(sum/weight-(total-sum)/rest)**2;if(between>max){max=between;best=i;}}const otsu=src.map(v=>v>best?255:0);const clahe=src.map(v=>clamp((v-best)*1.65+128));const adaptive=new Uint8ClampedArray(n),w=image.width,h=image.height,r=8;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,c=0;for(let yy=Math.max(0,y-r);yy<=Math.min(h-1,y+r);yy+=4)for(let xx=Math.max(0,x-r);xx<=Math.min(w-1,x+r);xx+=4){s+=src[yy*w+xx];c++;}adaptive[y*w+x]=src[y*w+x]>s/c-7?255:0;}const normalize=(v:Uint8ClampedArray)=>{let dark=0;v.forEach(x=>dark+=x<128?1:0);if(dark>v.length*.55)for(let i=0;i<v.length;i++)v[i]=255-v[i];return v};return{grayscale:makeImage(normalize(src),w,h),clahe:makeImage(normalize(clahe),w,h),otsu:makeImage(normalize(otsu),w,h),adaptive:makeImage(normalize(adaptive),w,h)}}

addEventListener('message',({data}:MessageEvent<Request>)=>{try{const geometry=detect(data.image,data.guide);if(!geometry){postMessage({id:data.id,error:'Bordi della carta non rilevati. Inquadra l’intera carta e riprova.'} satisfies Response);return;}const processed=variants(warp(data.image,geometry));postMessage({id:data.id,geometry,variants:processed} satisfies Response,Object.values(processed).map(v=>v.data.buffer));}catch(error){postMessage({id:data.id,error:error instanceof Error?error.message:'Rilevamento non riuscito.'} satisfies Response);}});
