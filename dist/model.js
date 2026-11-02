import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js?v=5';
import { buildNNNStep } from './binding.js?v=5';

export const defaults = { skiLength:180, skiWidth:4.8, tipRise:5.5, poleLength:150, bindings:true, bindingStyle:'nnn', straps:true };
const tones = {
  clay:['#c4c3bf','#545953','#92988d','#ecece6'],
  white:['#ededdf','#b6b9ac','#d0d3c5','#fafbef'],
  graphite:['#656a69','#363d3c','#828b85','#a0aaa0']
};
export const materials = Object.fromEntries(['body','binding','detail','accent'].map(key => [key,new THREE.MeshStandardMaterial({roughness:.72,metalness:.02})]));
materials.recess=new THREE.MeshStandardMaterial({color:'#292e29',roughness:.88});
materials.marker=new THREE.MeshStandardMaterial({color:'#30332f',roughness:.9});
export function setMaterial(name='clay') {
  (tones[name] || tones.clay).forEach((color,i)=>materials[['body','binding','detail','accent'][i]].color.set(color));
  materials.recess.color.set(name==='white'?'#909889':name==='graphite'?'#252e28':'#292e29');
}
setMaterial();
function mesh(geometry,material,parent,x=0,y=0,z=0) {
  const m = new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function box(parent,w,h,l,x,y,z,mat=materials.binding,r=.003) {
  return mesh(new RoundedBoxGeometry(w,h,l,3,Math.min(r,w*.42,h*.42,l*.42)),mat,parent,x,y,z);
}
function tube(parent,points,radius,mat=materials.binding,segments=32) {
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(path,segments,radius,7,false),mat,parent);
}
function segment(parent,a,b,r1,r2,mat=materials.binding) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const m=mesh(new THREE.CylinderGeometry(r2,r1,delta.length(),16),mat,parent);
  m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
function profile(t,opts) {
  const length=opts.skiLength/100,width=opts.skiWidth/100;
  let w=width*.5*(.94+.06*Math.pow(Math.abs(t-.48)*2,1.3));
  if(t<.008) w*=Math.sqrt(Math.max(.008,1-Math.pow(1-t/.008,2)));
  if(t>.943) w*=Math.sqrt(Math.max(.0003,1-Math.pow((t-.943)/.057,2)));
  const nose=Math.max(0,(t-.82)/.18);
  const y=.008*Math.pow(Math.sin(Math.PI*t),1.6)+(opts.tipRise/100)*Math.pow(nose,2.4)+.002*Math.pow(Math.max(0,(.04-t)/.04),2);
  const thickness=.0065+.006*Math.pow(Math.sin(Math.PI*t),1.2);
  return {w,y,thickness,z:(t-.5)*length};
}
function skiBody(opts) {
  const verts=[],indices=[];
  const ring=[[-1,.62],[-.87,.96],[-.3,1.02],[0,1.04],[.3,1.02],[.87,.96],[1,.62],[1,.15],[.85,0],[.20,0],[.09,.17],[0,.24],[-.09,.17],[-.2,0],[-.85,0],[-1,.15]];
  const N=200,R=ring.length;
  for(let i=0;i<=N;i++) {
    const p=profile(i/N,opts);
    for(const [x,y]of ring) verts.push(x*p.w,p.y+y*p.thickness,p.z);
    if(i<N) for(let j=0;j<R;j++) {
      const a=i*R+j,b=(i+1)*R+j,c=(i+1)*R+(j+1)%R,d=i*R+(j+1)%R;
      indices.push(a,b,c,a,c,d);
    }
  }
  for(const end of [0,N]) {
    const p=profile(end/N,opts),center=verts.length/3;verts.push(0,p.y+p.thickness*.5,p.z);
    for(let j=0;j<R;j++) {const a=end*R+j,b=end*R+(j+1)%R;indices.push(...(end===0?[center,a,b]:[center,b,a]));}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function buildBinding(parent,opts) {
  if(opts.bindingStyle==='block'){
    const marker=box(parent,Math.min(opts.skiWidth/100*.55,.028),.006,.34,0,profile(.45,opts).y+.016,-.15,materials.marker,.0006);
    marker.name='Условное крепление · прямоугольник';return;
  }
  buildNNNStep(parent,{width:Math.min(opts.skiWidth/100*.85,.041),top:profile(.45,opts).y+.013},materials);
}
export function createSki(opts) {
  const g=new THREE.Group();g.userData.kind='ski';mesh(skiBody(opts),materials.body,g);
  if(opts.bindings) buildBinding(g,opts);
  return g;
}
export function createPole(opts,side=1) {
  const g=new THREE.Group();g.userData.kind='pole';const length=opts.poleLength/100,lo=-length/2,hi=length/2;
  segment(g,[0,.013,lo+.026],[0,.013,hi-.146],.0031,.0049,materials.detail);
  segment(g,[0,.013,hi-.148],[.003,.015,hi-.018],.009,.010,materials.binding);
  segment(g,[.003,.015,hi-.019],[.005,.015,hi],.009,.0068,materials.binding);
  // Subtle ergonomic finger contours and a collar.
  for(let i=0;i<5;i++) {
    const z=hi-.04-i*.018;
    const r=mesh(new THREE.TorusGeometry(.0092,.0006,5,16),materials.detail,g,.001,.015,z);r.rotation.x=0;
  }
  segment(g,[0,.013,hi-.159],[0,.013,hi-.145],.0057,.0068,materials.binding);
  if(opts.straps) {
    const points=[[.007,.017,hi-.022],[side*.041,.018,hi-.074],[side*.061,.018,hi-.18],[side*.035,.016,hi-.201],[.008,.016,hi-.073],[.007,.017,hi-.022]];
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const a=[],idx=[],steps=70;
    for(let i=0;i<=steps;i++) {
      const p=path.getPoint(i/steps),t=path.getTangent(i/steps),n=new THREE.Vector3(-t.z,0,t.x).normalize().multiplyScalar(.0045);
      for(const [s,y]of [[-1,-.001],[1,-.001],[1,.001],[-1,.001]])a.push(p.x+n.x*s,p.y+y,p.z+n.z*s);
      if(i<steps)for(let j=0;j<4;j++){const k=i*4+j,b=i*4+(j+1)%4;idx.push(k,b,b+4,k,b+4,k+4);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));geo.setIndex(idx);geo.computeVertexNormals();
    const strapMaterial=materials.binding.clone();strapMaterial.side=THREE.DoubleSide;
    const strap=mesh(geo,strapMaterial,g);strap.userData.ownMaterial=true;
  }
  segment(g,[0,.013,lo],[0,.013,lo+.043],.0008,.0035,materials.binding);
  segment(g,[0,.013,lo+.037],[0,.013,lo+.062],.0045,.0045,materials.binding);
  // Asymmetric snow basket, similar to touring / recreational Nordic poles.
  const shape=new THREE.Shape();shape.moveTo(-.012,-.007);shape.bezierCurveTo(-.033,-.018,-.041,-.021,-.046,-.01);shape.lineTo(-.025,.003);shape.bezierCurveTo(-.018,.013,.016,.017,.025,.004);shape.lineTo(.043,-.008);shape.bezierCurveTo(.039,-.02,.021,-.017,.011,-.006);shape.closePath();
  const basket=mesh(new THREE.ExtrudeGeometry(shape,{depth:.004,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:2,steps:1}),materials.binding,g,0,.014,lo+.049);
  basket.rotation.y=side<0?Math.PI:0;
  return g;
}
export function replaceModel(object,opts) {
  const old=[...object.children];
  for(const child of old) {child.traverse(m=>{m.geometry?.dispose();if(m.userData.ownMaterial)m.material?.dispose();});object.remove(child);}
  const model=object.userData.kind==='ski'?createSki(opts):createPole(opts,object.userData.side);
  for(const child of [...model.children])object.add(child);
}
