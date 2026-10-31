// Camera geometry only: no sampling, execution or modification of curve data.
import { validateView } from './plot-view.mjs';
export function aspectView(requested, width, height) {
  const view=validateView(requested,false);
  if(!(width>0&&height>0&&Number.isFinite(width)&&Number.isFinite(height)))throw new Error('Nieprawidłowa powierzchnia wykresu.');
  const xs=view.xMax-view.xMin,ys=view.yMax-view.yMin;
  const cx=view.xMin+xs/2,cy=view.yMin+ys/2;
  const unit=Math.max(xs/width,ys/height),hx=unit*width/2,hy=unit*height/2;
  return validateView({xMin:cx-hx,xMax:cx+hx,yMin:cy-hy,yMax:cy+hy},false);
}
export function geometryZoom(view,factor,anchor={x:.5,y:.5}) {
  if(!(factor>0&&Number.isFinite(factor)))throw new Error('Nieprawidłowy współczynnik przybliżenia.');
  const xs=view.xMax-view.xMin,ys=view.yMax-view.yMin;
  // Bound both axes by the same factor, preserving geometry near minimum span.
  factor=Math.max(factor,1e-9/Math.min(xs,ys));
  const nx=xs*factor,ny=ys*factor;
  return validateView({xMin:view.xMin+(xs-nx)*anchor.x,xMax:view.xMax-(xs-nx)*(1-anchor.x),
    yMin:view.yMin+(ys-ny)*anchor.y,yMax:view.yMax-(ys-ny)*(1-anchor.y)},false);
}
export function geometryPan(view,dx,dy) {
  const x=(view.xMax-view.xMin)*dx,y=(view.yMax-view.yMin)*dy;
  return validateView({xMin:view.xMin+x,xMax:view.xMax+x,yMin:view.yMin+y,yMax:view.yMax+y},false);
}
