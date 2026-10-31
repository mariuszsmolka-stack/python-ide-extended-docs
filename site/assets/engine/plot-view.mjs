// Pure navigation and clipping of already computed samples; no execution bridge.
import { PLOT_LIMITS } from './qlc/qlc-plot-data.mjs';
export const SAMPLE_DOMAIN = Object.freeze({ min: -10, max: 10, step: 20 / (PLOT_LIMITS.points - 1) });
const minimumSpan = 1e-9;
export const sampleX = index => SAMPLE_DOMAIN.min + index / (1 / SAMPLE_DOMAIN.step);
export function validateView(view, bounded = true) {
  const result = {};
  for (const key of ['xMin', 'xMax', 'yMin', 'yMax']) {
    const raw = view[key];
    if (typeof raw !== 'number' && typeof raw !== 'string') throw new Error('Granice osi muszą być liczbami skończonymi.');
    const value = typeof raw === 'string' ? raw.trim().replace(',', '.') : raw;
    if (value === '' || !Number.isFinite(Number(value))) throw new Error('Granice osi muszą być liczbami skończonymi.');
    result[key] = Number(value);
  }
  for (const axis of ['x', 'y']) {
    const min = result[axis + 'Min'], max = result[axis + 'Max'], span = max - min;
    if (!(min < max)) throw new Error(`Oś ${axis.toUpperCase()}: minimum musi być mniejsze od maksimum.`);
    if (!Number.isFinite(span)) throw new Error(`Zakres osi ${axis.toUpperCase()} jest zbyt szeroki.`);
    if (span < Math.max(minimumSpan, Math.max(Math.abs(min), Math.abs(max)) * Number.EPSILON * 32)) throw new Error(`Zakres osi ${axis.toUpperCase()} jest zbyt wąski do stabilnego wyświetlenia.`);
  }
  if (bounded && (result.xMin < SAMPLE_DOMAIN.min || result.xMax > SAMPLE_DOMAIN.max)) throw new Error('Zakres X musi mieścić się od -10 do 10 - tylko dla tego zakresu istnieją próbki.');
  return result;
}
export function fitView(data, visible, xMin = SAMPLE_DOMAIN.min, xMax = SAMPLE_DOMAIN.max, includeZero = false) {
  if (data.version === 3 || data.version === 4) {
    const series=data.series||[data];
    const points = series.flatMap((item,i)=>visible[i]?item.contours.flat():[]).filter(point => point[0]/PLOT_LIMITS.implicitScale >= xMin && point[0]/PLOT_LIMITS.implicitScale <= xMax);
    if (!points.length) return null;
    let min = Math.min(...points.map(p=>p[1]/PLOT_LIMITS.implicitScale)), max = Math.max(...points.map(p=>p[1]/PLOT_LIMITS.implicitScale));
    if (max-min < 1e-6) { min-=.5; max+=.5; }
    const padding=(max-min)*.08;
    return validateView({xMin,xMax,yMin:Math.max(-10,min-padding),yMax:Math.min(10,max+padding)},false);
  }
  let min = Infinity, max = -Infinity, count = 0;
  data.curves.forEach((curve, curveIndex) => {
    if (!visible[curveIndex]) return;
    curve.forEach((value, i) => {
      const x = sampleX(i);
      if (value === null || x < xMin || x > xMax) return;
      min = Math.min(min, value); max = Math.max(max, value); count++;
    });
  });
  if (!count) return null;
  if (includeZero) { min = Math.min(0, min); max = Math.max(0, max); }
  if (max - min < 1e-6) { min -= 1; max += 1; }
  const padding = (max - min) * .08;
  return validateView({ xMin, xMax, yMin: min - padding, yMax: max + padding });
}
export function initialView(data) {
  if (data.version === 3 || data.version === 4) {
    const xs=(data.series||[data]).flatMap(item=>item.contours.flat()).map(p=>p[0]/PLOT_LIMITS.implicitScale);
    if (!xs.length) return {xMin:-10,xMax:10,yMin:-10,yMax:10};
    let min=Math.min(...xs),max=Math.max(...xs);
    if(max-min<1e-6){min-=.5;max+=.5;}
    const pad=(max-min)*.08;
    return fitView(data,(data.series||[data]).map(()=>true),Math.max(-10,min-pad),Math.min(10,max+pad));
  }
  return fitView(data, data.curves.map(() => true), -10, 10, true) || { xMin: -10, xMax: 10, yMin: -1, yMax: 1 };
}
function boundedX(min, span) {
  span = Math.min(20, Math.max(minimumSpan, span));
  min = Math.max(-10, Math.min(10 - span, min));
  return { xMin: Math.max(-10, min), xMax: Math.min(10, min + span) };
}
export function zoomView(view, factor, anchor = { x: .5, y: .5 }) {
  if (!(factor > 0) || !Number.isFinite(factor)) throw new Error('Nieprawidłowy współczynnik przybliżenia.');
  const xs = view.xMax - view.xMin, ys = view.yMax - view.yMin;
  const nextXs = Math.min(20, Math.max(minimumSpan, xs * factor)), nextYs = Math.max(minimumSpan, ys * factor);
  return validateView({ ...boundedX(view.xMin + xs * anchor.x - nextXs * anchor.x, nextXs),
    yMin: view.yMin + ys * anchor.y - nextYs * anchor.y,
    yMax: view.yMin + ys * anchor.y + nextYs * (1 - anchor.y) });
}
export function panView(view, dx, dy) {
  const xs = view.xMax - view.xMin, ys = view.yMax - view.yMin;
  return validateView({ ...boundedX(view.xMin + xs * dx, xs), yMin: view.yMin + ys * dy, yMax: view.yMax + ys * dy });
}
// Clip existing straight sample segments, never calculate a new function value.
export function clipSegment(x1, y1, x2, y2, view) {
  const dx = x2 - x1, dy = y2 - y1;
  let from = 0, to = 1;
  for (const [p, q] of [[-dx, x1 - view.xMin], [dx, view.xMax - x1], [-dy, y1 - view.yMin], [dy, view.yMax - y1]]) {
    if (p === 0) { if (q < 0) return null; }
    else {
      const ratio = q / p;
      if (p < 0) from = Math.max(from, ratio); else to = Math.min(to, ratio);
      if (from > to) return null;
    }
  }
  return [x1 + from * dx, y1 + from * dy, x1 + to * dx, y1 + to * dy];
}
