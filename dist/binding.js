import * as THREE from 'three';

// NNN Step reference: a rounded toe lever, a slotted guide plate and a separate heel.
// All recesses and ribs are geometry; no decals, logos or image textures are used.
function roundedPath(w,l,r,Path=THREE.Shape,cx=0,cy=0){
  const p=new Path(),x=cx-w/2,y=cy-l/2;r=Math.min(r,w/2,l/2);
  p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);
  p.lineTo(x+w,y+l-r);p.quadraticCurveTo(x+w,y+l,x+w-r,y+l);
  p.lineTo(x+r,y+l);p.quadraticCurveTo(x,y+l,x,y+l-r);
  p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);p.closePath();return p;
}
function recess(shape,w,l,x,z,r=.0015){shape.holes.push(roundedPath(w,l,r,THREE.Path,x,-z));}
function circleHole(shape,x,z,r){const p=new THREE.Path();p.absarc(x,-z,r,0,Math.PI*2,true);shape.holes.push(p);}
function part(parent,shape,depth,y,z,material,bevel=.00065){
  const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:16,steps:1});
  geo.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(geo,material);m.position.set(0,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function plate(parent,w,l,depth,y,z,material,r=.005){return part(parent,roundedPath(w,l,r),depth,y,z,material);}
function cylinder(parent,r,length,x,y,z,material,horizontal=false){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,24),material);m.position.set(x,y,z);if(horizontal)m.rotation.z=Math.PI/2;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function mainOutline(w,l){
  const s=new THREE.Shape();
  s.moveTo(0,-l/2);
  s.bezierCurveTo(-w*.37,-l/2,-w*.51,-l*.46,-w*.5,-l*.37);
  s.lineTo(-w*.48,-l*.20);s.bezierCurveTo(-w*.47,-l*.13,-w*.39,-l*.10,-w*.40,-l*.03);
  s.lineTo(-w*.37,l*.43);s.quadraticCurveTo(-w*.36,l*.5,-w*.22,l*.5);
  s.lineTo(w*.22,l*.5);s.quadraticCurveTo(w*.36,l*.5,w*.37,l*.43);
  s.lineTo(w*.40,-l*.03);s.bezierCurveTo(w*.39,-l*.10,w*.47,-l*.13,w*.48,-l*.20);
  s.lineTo(w*.5,-l*.37);s.bezierCurveTo(w*.51,-l*.46,w*.37,-l/2,0,-l/2);s.closePath();return s;
}

export function buildNNNStep(parent,{width,top,z=-.074},m){
  const g=new THREE.Group();g.name='NNN Step · носовая платформа';g.position.set(0,top,z);parent.add(g);
  const w=width,l=.238;
  part(g,mainOutline(w,l),.0038,0,0,m.binding);
  // The rear deck has three pairs of deep, open-bottom recesses over a solid base.
  const deck=roundedPath(w*.78,.139,.006);
  for(const side of [-1,1])for(const zz of [-.043,0,.043])recess(deck,w*.13,.031,side*w*.235,zz,.0015);
  recess(deck,w*.205,.011,0,-.056,.0035);
  part(g,deck,.0052,.004,-.044,m.binding,.0005);
  for(const side of [-1,1]){
    const lip=plate(g,w*.07,.126,.002,.009,-.043,m.binding,.0014);lip.position.x=side*w*.355;
    const well=plate(g,w*.13,.122,.0005,.0041,-.044,m.recess,.001);well.position.x=side*w*.235;
  }
  // Screw slot at the back, including its recessed rim.
  const slot=roundedPath(w*.27,.013,.004);recess(slot,w*.16,.007,0,0,.0025);
  part(g,slot,.001,.0095,-.100,m.detail,.0003);
  plate(g,w*.15,.0065,.0006,.0045,-.100,m.recess,.002);
  // Paired toe jaws and a transverse metal boot-bar hinge.
  for(const side of [-1,1]){
    const jaw=plate(g,w*.20,.025,.011,.005,.022,m.binding,.002);jaw.position.x=side*w*.265;
    cylinder(g,.0022,.002,side*w*.34,.0175,.029,m.detail,true);
    cylinder(g,.0019,.001,side*w*.36,.0047,.035,m.recess);
  }
  cylinder(g,.00165,w*.78,0,.017,.029,m.detail,true);
  // The lever rises towards the hinge, with a true aperture around the ribbed pad.
  const lever=new THREE.Group();lever.position.set(0,.008,.077);lever.rotation.x=.11;g.add(lever);
  plate(lever,w*.91,.076,.005,0,0,m.binding,.009);
  const shell=roundedPath(w*.80,.071,.008);recess(shell,w*.33,.033,0,.008,.004);
  part(lever,shell,.0095,.004,0,m.accent,.0011);
  plate(lever,w*.29,.029,.0018,.005,.008,m.recess,.0038);
  for(let i=0;i<7;i++){
    const rib=plate(lever,w*.245,.0014,.001,.0078,.008+(i-3)*.0035,m.binding,.0005);
    rib.rotation.z=(i-3)*.012;
  }
  plate(lever,w*.47,.0022,.0009,.0144,.026,m.binding,.0005);
  for(let i=0;i<3;i++)plate(lever,w*(.59+i*.045),.0028,.002,.0142,-.020+i*.005,m.accent,.001);
  // Independent heel pad: rounded crown, two guide channels and a countersunk screw.
  const heel=new THREE.Group();heel.name='NNN Step · пятка';heel.position.set(0,top-.001,-.324);parent.add(heel);
  const hw=w*.94,hl=.089;
  plate(heel,hw,hl,.0035,0,0,m.binding,.008);
  const crown=roundedPath(hw*.95,hl*.95,.007);
  for(const side of [-1,1])for(const zz of [-.025,.025])recess(crown,hw*.12,.029,side*hw*.225,zz,.0017);
  circleHole(crown,0,0,.0035);
  part(heel,crown,.007,.0037,0,m.binding,.00075);
  for(const side of [-1,1]){
    const well=plate(heel,hw*.115,.077,.0004,.0038,0,m.recess,.002);well.position.x=side*hw*.225;
  }
  cylinder(heel,.0022,.0006,0,.0042,0,m.recess);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.0029,.00045,6,24),m.detail);rim.rotation.x=Math.PI/2;rim.position.set(0,.009,0);rim.castShadow=true;heel.add(rim);
  return g;
}
