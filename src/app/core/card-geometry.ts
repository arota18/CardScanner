import { CardGeometry, Point, Region } from './models';

export const CANONICAL_CARD = { width: 900 as const, height: 1257 as const };
export const DETECTION_THRESHOLDS = {
  minAreaRatio: .18, maxAreaRatio: .92, minAspect: .58, maxAspect: .86,
  minGuideOverlap: .45, minScore: .52,
} as const;

export interface QuadCandidate { corners: readonly Point[]; area?: number; convex?: boolean }

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export const polygonArea = (points: readonly Point[]): number => Math.abs(points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y;
}, 0) / 2);

export function orderCorners(points: readonly Point[]): [Point, Point, Point, Point] {
  if (points.length !== 4) throw new Error('Servono quattro angoli.');
  const center = points.reduce((p, q) => ({ x: p.x + q.x / 4, y: p.y + q.y / 4 }), { x: 0, y: 0 });
  const sorted = [...points].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
  const first = sorted.reduce((best, p, i) => p.x + p.y < sorted[best].x + sorted[best].y ? i : best, 0);
  const result = [...sorted.slice(first), ...sorted.slice(0, first)] as [Point, Point, Point, Point];
  if (cross(result[0], result[1], result[2]) < 0) return [result[0], result[3], result[2], result[1]];
  return result;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function scoreQuadrilateral(candidate: QuadCandidate, width: number, height: number, guide?: Region): number {
  if (candidate.corners.length !== 4) return 0;
  const p = orderCorners(candidate.corners); const areaRatio = (candidate.area ?? polygonArea(p)) / (width * height);
  const cardWidth = (distance(p[0], p[1]) + distance(p[3], p[2])) / 2;
  const cardHeight = (distance(p[0], p[3]) + distance(p[1], p[2])) / 2;
  const aspect = cardWidth / Math.max(1, cardHeight);
  if (areaRatio < DETECTION_THRESHOLDS.minAreaRatio || areaRatio > DETECTION_THRESHOLDS.maxAreaRatio || aspect < DETECTION_THRESHOLDS.minAspect || aspect > DETECTION_THRESHOLDS.maxAspect) return 0;
  const convex = candidate.convex ?? p.every((point, i) => cross(point, p[(i + 1) % 4], p[(i + 2) % 4]) > 0);
  if (!convex) return 0;
  const xs = p.map(v => v.x), ys = p.map(v => v.y); const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  let overlap = 1;
  if (guide) {
    const gx = guide.x * width, gy = guide.y * height, gw = guide.width * width, gh = guide.height * height;
    const intersection = Math.max(0, Math.min(box.x + box.width, gx + gw) - Math.max(box.x, gx)) * Math.max(0, Math.min(box.y + box.height, gy + gh) - Math.max(box.y, gy));
    overlap = intersection / Math.max(1, Math.min(box.width * box.height, gw * gh));
    if (overlap < DETECTION_THRESHOLDS.minGuideOverlap) return 0;
  }
  const idealAspect = 63 / 88;
  return .45 * Math.min(1, areaRatio / .55) + .35 * Math.max(0, 1 - Math.abs(aspect - idealAspect) / .2) + .2 * overlap;
}

export function selectQuadrilateral(candidates: readonly QuadCandidate[], width: number, height: number, guide?: Region): CardGeometry | undefined {
  const ranked = candidates.map(value => ({ value, score: scoreQuadrilateral(value, width, height, guide) })).sort((a, b) => b.score - a.score);
  if (!ranked[0] || ranked[0].score < DETECTION_THRESHOLDS.minScore) return undefined;
  return { corners: orderCorners(ranked[0].value.corners), sourceWidth: width, sourceHeight: height, canonicalWidth: 900, canonicalHeight: 1257, score: ranked[0].score };
}

/** Solves the 8 coefficients mapping destination points back into source space. */
export function inverseHomography(corners: readonly [Point, Point, Point, Point], width = 900, height = 1257): number[] {
  const dst = [{x:0,y:0},{x:width-1,y:0},{x:width-1,y:height-1},{x:0,y:height-1}];
  const a: number[][] = []; const b: number[] = [];
  for (let i=0;i<4;i++) { const {x,y}=dst[i], s=corners[i]; a.push([x,y,1,0,0,0,-x*s.x,-y*s.x]); b.push(s.x); a.push([0,0,0,x,y,1,-x*s.y,-y*s.y]); b.push(s.y); }
  for (let i=0;i<8;i++) { let pivot=i; for(let j=i+1;j<8;j++) if(Math.abs(a[j][i])>Math.abs(a[pivot][i])) pivot=j; [a[i],a[pivot]]=[a[pivot],a[i]]; [b[i],b[pivot]]=[b[pivot],b[i]]; const d=a[i][i]; if(Math.abs(d)<1e-9) throw new Error('Omografia non valida.'); for(let j=i;j<8;j++) a[i][j]/=d; b[i]/=d; for(let k=0;k<8;k++) if(k!==i){const f=a[k][i]; for(let j=i;j<8;j++)a[k][j]-=f*a[i][j]; b[k]-=f*b[i];} }
  return [...b, 1];
}

export function regionPixels(region: Region, width = 900, height = 1257): {x:number;y:number;width:number;height:number} {
  return { x: Math.round(region.x*width), y: Math.round(region.y*height), width: Math.round(region.width*width), height: Math.round(region.height*height) };
}
