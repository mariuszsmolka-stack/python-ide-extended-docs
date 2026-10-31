// Local WebGL2 renderer. Shader source and materials are trusted constants, never wire data.
export const MESH_PALETTES=Object.freeze([
  Object.freeze(['#2C7396','#32B4C4','#86D8C7']),
  Object.freeze(['#A65A32','#E9A04B','#F0C675']),
  Object.freeze(['#6D5AA6','#A68FD4','#C6AFE8']),
]);
const RGB_PALETTES=MESH_PALETTES.map(p=>p.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)));
const SVG='http://www.w3.org/2000/svg';
// The transfer quantizes positions to 1e-5. Treat a few quanta as a flat field,
// rather than magnifying rounding noise into a full palette. No shader division.
export function meshHeightRange(vertices){
  if(!vertices||!Number.isSafeInteger(vertices.length)||vertices.length%3)throw new TypeError('Invalid 3D positions');
  if(!vertices.length)return [0,0];
  let min=Infinity,max=-Infinity;
  for(let i=0;i<vertices.length;i++){
    if(!Number.isFinite(vertices[i]))throw new TypeError('Nonfinite 3D position');
    if(i%3===2){min=Math.min(min,vertices[i]);max=Math.max(max,vertices[i]);}
  }
  const center=min/2+max/2,span=max-min;
  if(!Number.isFinite(center)||!Number.isFinite(span))throw new TypeError('Invalid 3D height range');
  return [center,span>4e-5?1/span:0];
}
const live=new Set();let buffers=0,contexts=0,frames=0;
export function meshDiagnostics(){return {scenes:live.size,buffers,contexts,frames};}
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
function multiply(a,b){const c=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];return c;}
function cameraMatrix(camera,aspect){
  const {yaw,pitch,distance,target}=camera;
  const eye=[Math.cos(yaw)*Math.cos(pitch),Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch)].map((v,i)=>v*distance+target[i]);
  const z=normalize(sub(eye,target)),x=normalize(cross([0,0,1],z)),y=cross(z,x);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  const f=1/Math.tan(Math.PI/6),near=.03,far=2500;
  const projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  return {matrix:multiply(projection,view),right:x,up:y};
}
function normals(mesh){
  const result=new Float32Array(mesh.vertices.length),p=mesh.vertices,t=mesh.triangles;
  for(let i=0;i<t.length;i+=3){const a=t[i]*3,b=t[i+1]*3,c=t[i+2]*3;
    const n=cross([p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]]);
    for(const j of [a,b,c])for(let k=0;k<3;k++)result[j+k]+=n[k];
  }
  for(let i=0;i<result.length;i+=3){const length=Math.hypot(result[i],result[i+1],result[i+2])||1;for(let k=0;k<3;k++)result[i+k]/=length;}
  return result;
}
const VERTEX=`#version 300 es
in vec3 aPosition; in vec3 aNormal; uniform mat4 uMatrix; out vec3 normal; out float height;
void main(){gl_Position=uMatrix*vec4(aPosition,1.0);normal=aNormal;height=aPosition.z;}`;
const FRAGMENT=`#version 300 es
precision highp float; in vec3 normal; in float height; uniform vec3 uColor; uniform float uAlpha; uniform bool uLine;
uniform vec3 uLow; uniform vec3 uMiddle; uniform vec3 uHigh; uniform vec2 uHeightRange; out vec4 color;
void main(){float light=1.0;vec3 base=uColor;if(!uLine){float t=clamp((height-uHeightRange.x)*uHeightRange.y+0.5,0.0,1.0);base=t<0.5?mix(uLow,uMiddle,t*2.0):mix(uMiddle,uHigh,(t-0.5)*2.0);vec3 n=normalize(normal);if(!gl_FrontFacing)n=-n;light=0.26+0.59*max(0.0,dot(n,normalize(vec3(0.5,-0.7,1.0))))+0.15*max(0.0,dot(n,normalize(vec3(-0.8,0.4,0.2))));}color=vec4(base*light,uAlpha);}`;
function svg(tag,attributes={},text){const n=document.createElementNS(SVG,tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,v);if(text)n.textContent=text;return n;}
export class MeshRenderer{
  constructor(container,meshes,notify){
    this.container=container;this.meshes=meshes;this.notify=notify;this.visible=meshes.map(()=>true);this.wire=false;
    this.camera={yaw:.8,pitch:.55,distance:18,target:[0,0,0]};this.disposed=false;this.lost=false;this.frame=0;this.gpu=[];this.owned=[];this.counted=false;
    this.canvas=document.createElement('canvas');this.canvas.className='mesh-canvas';this.canvas.tabIndex=0;
    this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Powierzchnie 3D. Przeciągnij aby obracać; Shift i przeciąganie przesuwa; kółko przybliża. Strzałki obracają, Shift i strzałki przesuwają, Home resetuje.');
    this.gizmo=svg('svg',{class:'mesh-gizmo',viewBox:'0 0 110 110','aria-hidden':'true'});
    this.axisLabels=svg('svg',{class:'mesh-labels','aria-hidden':'true'});
    this.message=document.createElement('p');this.message.className='mesh-context-message';this.message.hidden=true;
    container.append(this.canvas,this.axisLabels,this.gizmo,this.message);live.add(this);
    try{this.gl=this.canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true});}catch{this.gl=null;}
    if(!this.gl){this.message.hidden=false;this.message.textContent='Brak obsługi WebGL2. Geometria została obliczona, ale nie można wyświetlić sceny.';this.canvas.dataset.state='unavailable';return;}
    this.onLost=event=>{event.preventDefault();if(this.disposed)return;this.lost=true;this.releaseGPU(false);this.message.hidden=false;this.message.textContent='Utracono kontekst WebGL. Oczekiwanie na przywrócenie.';this.canvas.dataset.state='lost';};
    this.onRestored=()=>{if(this.disposed)return;try{this.lost=false;this.initialize();this.message.hidden=true;this.invalidate();}catch(e){this.fail(e);}};
    this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
    try{this.heightRanges=meshes.map(m=>meshHeightRange(m.vertices));this.initialize();this.installControls();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.fit(true);this.initial=structuredClone(this.camera);this.resize();}catch(e){this.fail(e);}
  }
  fail(error){this.releaseGPU();this.message.hidden=false;this.message.textContent='Nie udało się przygotować WebGL2: '+error.message;this.canvas.dataset.state='error';}
  initialize(){
    const gl=this.gl;this.releaseGPU();
    const shader=(type,source)=>{const s=gl.createShader(type);if(!s)throw new Error('Brak zasobów GPU');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const text=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(text);}return s;};
    let vs,fs;
    try{vs=shader(gl.VERTEX_SHADER,VERTEX);fs=shader(gl.FRAGMENT_SHADER,FRAGMENT);this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));}
    finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
    this.locations={position:gl.getAttribLocation(this.program,'aPosition'),normal:gl.getAttribLocation(this.program,'aNormal'),matrix:gl.getUniformLocation(this.program,'uMatrix'),color:gl.getUniformLocation(this.program,'uColor'),alpha:gl.getUniformLocation(this.program,'uAlpha'),line:gl.getUniformLocation(this.program,'uLine'),low:gl.getUniformLocation(this.program,'uLow'),middle:gl.getUniformLocation(this.program,'uMiddle'),high:gl.getUniformLocation(this.program,'uHigh'),heightRange:gl.getUniformLocation(this.program,'uHeightRange')};
    const buffer=(target,data)=>{const b=gl.createBuffer();if(!b)throw new Error('Brak zasobów GPU');this.owned.push(b);buffers++;gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;};
    this.gpu=this.meshes.map(m=>{
      const wire=new Uint32Array(m.triangles.length*2);for(let i=0,j=0;i<m.triangles.length;i+=3){const a=m.triangles[i],b=m.triangles[i+1],c=m.triangles[i+2];wire.set([a,b,b,c,c,a],j);j+=6;}
      return {position:buffer(gl.ARRAY_BUFFER,m.vertices),normal:buffer(gl.ARRAY_BUFFER,normals(m)),triangles:buffer(gl.ELEMENT_ARRAY_BUFFER,m.triangles),wire:buffer(gl.ELEMENT_ARRAY_BUFFER,wire),count:m.triangles.length,wireCount:wire.length};
    });
    const grid=[];for(let n=-6;n<=6;n+=2)grid.push(-6,n,0,6,n,0,n,-6,0,n,6,0);
    this.grid=buffer(gl.ARRAY_BUFFER,new Float32Array(grid));this.gridCount=grid.length/3;
    this.axes=buffer(gl.ARRAY_BUFFER,new Float32Array([-6,0,0,6,0,0,0,-6,0,0,6,0,0,0,-6,0,0,6]));
    this.vao=gl.createVertexArray();if(!this.vao)throw new Error('Brak zasobów GPU');
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(20/255,44/255,67/255,1);
    this.counted=true;contexts++;this.canvas.dataset.state='ready';
  }
  releaseGPU(remove=true){
    if(this.gl){if(remove)for(const b of this.owned)this.gl.deleteBuffer(b);buffers-=this.owned.length;this.owned=[];this.gpu=[];if(remove&&this.program)this.gl.deleteProgram(this.program);if(remove&&this.vao)this.gl.deleteVertexArray(this.vao);this.program=null;this.vao=null;if(this.counted){contexts--;this.counted=false;}}
  }
  resize(){
    if(this.disposed||!this.gl||this.lost)return;
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    const ratio=Math.min(devicePixelRatio||1,1.5,1200/w,900/h);this.canvas.width=Math.max(1,Math.round(w*ratio));this.canvas.height=Math.max(1,Math.round(h*ratio));
    this.axisLabels.setAttribute('viewBox',`0 0 ${w} ${h}`);this.invalidate();
  }
  fit(initial=false){
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let count=0;
    this.meshes.forEach((m,k)=>{if(!this.visible[k])return;for(let i=0;i<m.vertices.length;i+=3){count++;for(let a=0;a<3;a++){min[a]=Math.min(min[a],m.vertices[i+a]);max[a]=Math.max(max[a],m.vertices[i+a]);}}});
    if(!count){this.notify('Brak widocznej geometrii do dopasowania.');return;}
    const target=min.map((v,i)=>(v+max[i])/2);let radius=0;
    this.meshes.forEach((m,k)=>{if(this.visible[k])for(let i=0;i<m.vertices.length;i+=3)radius=Math.max(radius,Math.hypot(...target.map((v,a)=>m.vertices[i+a]-v)));});
    const aspect=Math.max(.2,this.container.clientWidth/Math.max(1,this.container.clientHeight));
    this.camera={...this.camera,target,distance:Math.max(initial?5:.2,radius)*2.4/Math.min(1,aspect)};this.invalidate();
  }
  reset(){if(this.initial)this.camera=structuredClone(this.initial);this.invalidate();}
  zoom(factor){this.camera.distance=Math.max(.3,Math.min(500,this.camera.distance*factor));this.invalidate();}
  pan(dx,dy){const basis=cameraMatrix(this.camera,1),scale=this.camera.distance*1.15;this.camera.target=this.camera.target.map((v,i)=>v+basis.right[i]*dx*scale+basis.up[i]*dy*scale);this.invalidate();}
  orbit(dx,dy){this.camera.yaw-=dx;this.camera.pitch=Math.max(-1.45,Math.min(1.45,this.camera.pitch+dy));this.invalidate();}
  installControls(){
    const c=this.canvas;let drag=null;
    c.addEventListener('contextmenu',e=>e.preventDefault());
    c.addEventListener('pointerdown',e=>{if(![0,1,2].includes(e.button))return;e.preventDefault();c.focus({preventScroll:true});c.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button!==0};});
    c.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const dx=(e.clientX-drag.x)/Math.max(1,c.clientWidth),dy=(e.clientY-drag.y)/Math.max(1,c.clientHeight);if(drag.pan)this.pan(-dx,dy);else this.orbit(dx*5,dy*4);drag.x=e.clientX;drag.y=e.clientY;});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(name,()=>drag=null);
    c.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY<0?.9:1/.9);},{passive:false});
    c.addEventListener('keydown',e=>{const action={ArrowLeft:()=>e.shiftKey?this.pan(-.05,0):this.orbit(-.1,0),ArrowRight:()=>e.shiftKey?this.pan(.05,0):this.orbit(.1,0),ArrowUp:()=>e.shiftKey?this.pan(0,.05):this.orbit(0,.1),ArrowDown:()=>e.shiftKey?this.pan(0,-.05):this.orbit(0,-.1),'+':()=>this.zoom(.8),'-':()=>this.zoom(1.25),Home:()=>this.reset()}[e.key];if(action){e.preventDefault();action();}});
  }
  invalidate(){if(this.disposed||!this.gl||this.lost||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;if(!this.disposed&&!this.lost)this.render();});}
  render(){
    const gl=this.gl;if(!this.program)return;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.bindVertexArray(this.vao);
    const basis=cameraMatrix(this.camera,this.canvas.width/this.canvas.height),l=this.locations;gl.uniformMatrix4fv(l.matrix,false,basis.matrix);
    const bindPosition=b=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l.position);gl.vertexAttribPointer(l.position,3,gl.FLOAT,false,0,0);};
    gl.disableVertexAttribArray(l.normal);gl.vertexAttrib3f(l.normal,0,0,1);gl.uniform1i(l.line,true);gl.uniform1f(l.alpha,1);gl.uniform3fv(l.color,[.26,.36,.46]);bindPosition(this.grid);gl.drawArrays(gl.LINES,0,this.gridCount);
    bindPosition(this.axes);for(let a=0;a<3;a++){gl.uniform3fv(l.color,[[.95,.27,.35],[.27,.85,.48],[.36,.65,1]][a]);gl.drawArrays(gl.LINES,a*2,2);}
    gl.disable(gl.BLEND);
    this.gpu.forEach((m,k)=>{if(!this.visible[k])return;bindPosition(m.position);gl.bindBuffer(gl.ARRAY_BUFFER,m.normal);gl.enableVertexAttribArray(l.normal);gl.vertexAttribPointer(l.normal,3,gl.FLOAT,false,0,0);gl.uniform1i(l.line,false);gl.uniform1f(l.alpha,1);gl.uniform3fv(l.low,RGB_PALETTES[k][0]);gl.uniform3fv(l.middle,RGB_PALETTES[k][1]);gl.uniform3fv(l.high,RGB_PALETTES[k][2]);gl.uniform2fv(l.heightRange,this.heightRanges[k]);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.triangles);if(this.wire){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);}gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);gl.disable(gl.POLYGON_OFFSET_FILL);if(this.wire){gl.uniform1i(l.line,true);gl.uniform1f(l.alpha,1);gl.uniform3fv(l.color,[.75,.85,.94]);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.wire);gl.drawElements(gl.LINES,m.wireCount,gl.UNSIGNED_INT,0);}});
    gl.disable(gl.BLEND);gl.bindVertexArray(null);frames++;
    this.canvas.dataset.frames=String(Number(this.canvas.dataset.frames||0)+1);this.canvas.dataset.camera=JSON.stringify(this.camera);
    const w=this.container.clientWidth,h=this.container.clientHeight;this.axisLabels.replaceChildren();this.gizmo.replaceChildren(svg('circle',{cx:55,cy:55,r:3,fill:'#d3dfef'}));
    const labels=['X','Y','Z'],colors=['#ff6574','#62df91','#73b5ff'];
    for(let a=0;a<3;a++){
      const end=[0,0,0];end[a]=6.35;const p=[0,0,0,0];for(let row=0;row<4;row++)p[row]=basis.matrix[row]*end[0]+basis.matrix[4+row]*end[1]+basis.matrix[8+row]*end[2]+basis.matrix[12+row];
      if(p[3]>0){const x=(p[0]/p[3]+1)*w/2,y=(1-p[1]/p[3])*h/2;if(x>10&&x<w-10&&y>15&&y<h-10)this.axisLabels.append(svg('text',{x,y,fill:colors[a],'text-anchor':'middle'},labels[a]));}
      const x=55+basis.right[a]*34,y=55-basis.up[a]*34;this.gizmo.append(svg('line',{x1:55,y1:55,x2:x,y2:y,stroke:colors[a],'stroke-width':2}),svg('text',{x:x+3,y:y-4,fill:colors[a]},labels[a]));
    }
  }
  capture(){
    if(this.disposed||this.lost||!this.program||!this.gl)throw new Error('Scena 3D nie jest gotowa do wydruku.');
    // Render the current camera/visibility synchronously, using the existing GL.
    this.render();this.gl.finish();
    const copy=document.createElement('canvas');copy.width=this.canvas.width;copy.height=this.canvas.height;
    const context=copy.getContext('2d');if(!context)throw new Error('Nie można przygotować obrazu sceny.');
    context.drawImage(this.canvas,0,0);return copy;
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.resizeObserver?.disconnect();
    if(this.gl){this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);this.releaseGPU();this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
    this.meshes=[];live.delete(this);
  }
}
