import { describe, expect, it } from 'vitest';
import { inverseHomography, orderCorners, regionPixels, selectQuadrilateral } from './card-geometry';

describe('card geometry', () => {
  it('orders arbitrary corners clockwise from top-left', () => {
    expect(orderCorners([{x:90,y:180},{x:10,y:20},{x:100,y:10},{x:5,y:190}])).toEqual([
      {x:10,y:20},{x:100,y:10},{x:90,y:180},{x:5,y:190},
    ]);
  });
  it('maps canonical corners back to the detected quadrilateral', () => {
    const corners=[{x:10,y:20},{x:110,y:25},{x:100,y:200},{x:5,y:190}] as const;
    const h=inverseHomography(corners,900,1257);
    const map=(x:number,y:number)=>({x:(h[0]*x+h[1]*y+h[2])/(h[6]*x+h[7]*y+1),y:(h[3]*x+h[4]*y+h[5])/(h[6]*x+h[7]*y+1)});
    expect(map(0,0)).toEqual(corners[0]); expect(map(899,1256).x).toBeCloseTo(corners[2].x);
  });
  it('selects a plausible card and rejects a scene without one', () => {
    const card={corners:[{x:160,y:40},{x:480,y:50},{x:470,y:450},{x:150,y:440}]};
    expect(selectQuadrilateral([card],640,480,{x:.2,y:.05,width:.6,height:.9})).toBeDefined();
    expect(selectQuadrilateral([{corners:[{x:1,y:1},{x:10,y:1},{x:10,y:10},{x:1,y:10}]}],640,480)).toBeUndefined();
  });
  it('computes canonical crop coordinates',()=>expect(regionPixels({x:.1,y:.2,width:.5,height:.25})).toEqual({x:90,y:251,width:450,height:314}));
});
