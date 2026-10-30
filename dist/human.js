import * as THREE from 'three';

const V=(a)=>new THREE.Vector3(...a),D=Math.PI/180;
const Q=(a)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.map(n=>n*D),'XYZ'));
export const CONTROL_NAMES={pelvis:'Таз',torso:'Корпус',head:'Голова',leftHand:'Левая кисть',rightHand:'Правая кисть',leftFoot:'Левая стопа',rightFoot:'Правая стопа',leftElbow:'Левый локоть',rightElbow:'Правый локоть',leftKnee:'Левое колено',rightKnee:'Правое колено'};
export const TARGETS=['leftHand','rightHand','leftFoot','rightFoot'];
export function defaultHuman(){return {height:175,pelvis:[0,.965,0],pelvisRot:[0,0,0],torso:[0,0,0],head:[0,0,0],targets:{leftHand:[.25,1.08,.24],rightHand:[-.25,1.08,.24],leftFoot:[.115,.035,.13],rightFoot:[-.115,.035,.13]},rotations:{leftHand:[0,0,0],rightHand:[0,0,0],leftFoot:[0,0,0],rightFoot:[0,0,0]},swivel:{leftHand:-12,rightHand:12,leftFoot:0,rightFoot:0}};}

export function solveTwoBone(start,target,a,b,preferred,swivel=0){
  const delta=target.clone().sub(start),requested=delta.length(),axis=requested>1e-7?delta.multiplyScalar(1/requested):new THREE.Vector3(0,-1,0);
  const minimum=Math.sqrt(a*a+b*b+2*a*b*Math.cos(155*D));
  const distance=THREE.MathUtils.clamp(requested,minimum,a+b-.0001);
  let normal=preferred.clone().addScaledVector(axis,-preferred.dot(axis));
  if(normal.lengthSq()<1e-8)normal=new THREE.Vector3(1,0,0).addScaledVector(axis,-axis.x);
  if(normal.lengthSq()<1e-8)normal.set(0,0,1);
  normal.normalize().applyAxisAngle(axis,swivel*D);
  const along=(a*a-b*b+distance*distance)/(2*distance),away=Math.sqrt(Math.max(0,a*a-along*along));
  const joint=start.clone().addScaledVector(axis,along).addScaledVector(normal,away),end=start.clone().addScaledVector(axis,distance);
  return {joint,end,limited:Math.abs(requested-distance)>.012,bend:180-Math.acos(THREE.MathUtils.clamp((a*a+b*b-distance*distance)/(2*a*b),-1,1))/D};
}

export class HumanRig extends THREE.Group {
  constructor(){
    super();this.name='Манекен';this.userData={kind:'human',id:4};this.state=defaultHuman();this.initialized=false;this.visible=false;
    this.body=new THREE.Group();this.add(this.body);this.helpers=new THREE.Group();this.helpers.visible=false;this.add(this.helpers);
    this.materials={body:new THREE.MeshStandardMaterial({color:'#a7b3c2',roughness:.8}),joint:new THREE.MeshStandardMaterial({color:'#778598',roughness:.85}),boot:new THREE.MeshStandardMaterial({color:'#485460',roughness:.85})};
    this.sphere=new THREE.SphereGeometry(1,20,14);this.cylinder=new THREE.CylinderGeometry(1,1,1,14);
    this.parts={};this.controls={};this.frames={};this.limbs={};this.warnings=[];
    const labels=['pelvis','waist','chest','neck','head','nose','leftShoulder','rightShoulder','leftHip','rightHip','leftElbow','rightElbow','leftKnee','rightKnee','leftHand','rightHand','leftFoot','rightFoot'];
    for(const name of labels){const mat=name.includes('Foot')?this.materials.boot:/Elbow|Knee|Shoulder|Hip|neck/.test(name)?this.materials.joint:this.materials.body;const m=new THREE.Mesh(this.sphere,mat);m.castShadow=true;m.receiveShadow=true;m.userData.control=name==='chest'||name==='waist'?'torso':name==='nose'||name==='neck'?'head':name.endsWith('Shoulder')?name.startsWith('left')?'leftHand':'rightHand':name.endsWith('Hip')?'pelvis':name;this.body.add(m);this.parts[name]=m;}
    for(const name of ['leftUpperArm','leftForearm','rightUpperArm','rightForearm','leftThigh','leftShin','rightThigh','rightShin']){const m=new THREE.Mesh(this.cylinder,this.materials.body);m.castShadow=true;m.receiveShadow=true;m.userData.control=name.includes('Arm')||name.includes('Forearm')?name.startsWith('left')?'leftHand':'rightHand':name.startsWith('left')?'leftFoot':'rightFoot';this.body.add(m);this.parts[name]=m;}
    const colors={pelvis:0xd39836,torso:0xd39836,head:0xd39836,leftHand:0x3d83c6,rightHand:0x3d83c6,leftFoot:0x789344,rightFoot:0x789344,leftElbow:0x969fa8,rightElbow:0x969fa8,leftKnee:0x969fa8,rightKnee:0x969fa8};
    for(const key of Object.keys(CONTROL_NAMES)){const c=new THREE.Group();c.name=CONTROL_NAMES[key];c.userData.control=key;const dot=new THREE.Mesh(new THREE.SphereGeometry(.018,12,8),new THREE.MeshBasicMaterial({color:colors[key],depthTest:false,transparent:true,opacity:.9}));dot.renderOrder=10;dot.userData.control=key;c.add(dot);this.helpers.add(c);this.controls[key]=c;}
    this.update();
  }
  setTone(tone){const palette=tone==='white'?['#d8dee6','#a1adba','#6b7580']:tone==='graphite'?['#697786','#414f60','#303b47']:['#a7b3c2','#778598','#485460'];Object.values(this.materials).forEach((m,i)=>m.color.set(palette[i]));}
  blob(name,p,size,q=new THREE.Quaternion()){const m=this.parts[name];m.position.copy(p);m.scale.set(...size);m.quaternion.copy(q);}
  segment(name,a,b,r){const m=this.parts[name],d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
  target(key){const p=V(this.state.targets[key]),s=this.state.height/175;p.x*=s;p.z*=s;if(!key.includes('Foot'))p.y*=s;return p;}
  setTarget(key,p){const s=this.state.height/175;this.state.targets[key]=[p.x/s,key.includes('Foot')?p.y:p.y/s,p.z/s];}
  update(){
    const st=this.state,s=st.height/175,pelvis=V(st.pelvis).multiplyScalar(s),pq=Q(st.pelvisRot),tq=pq.clone().multiply(Q(st.torso)),hq=tq.clone().multiply(Q(st.head));this.warnings=[];
    const offset=(x,y,z,q=tq)=>new THREE.Vector3(x*s,y*s,z*s).applyQuaternion(q).add(pelvis);
    this.blob('pelvis',offset(0,.015,0,pq),[.16*s,.115*s,.105*s],pq);
    this.blob('waist',offset(0,.17,0),[.125*s,.17*s,.09*s],tq);
    this.blob('chest',offset(0,.30,0),[.19*s,.205*s,.115*s],tq);
    this.blob('neck',offset(0,.505,0),[.052*s,.075*s,.05*s],tq);
    const head=offset(0,.655,0);this.blob('head',head,[.097*s,.125*s,.105*s],hq);this.blob('nose',head.clone().add(new THREE.Vector3(0,-.005*s,.099*s).applyQuaternion(hq)),[.013*s,.022*s,.018*s],hq);
    this.controls.pelvis.position.copy(pelvis);this.controls.pelvis.quaternion.copy(pq);this.controls.torso.position.copy(offset(0,.26,0));this.controls.torso.quaternion.copy(tq);this.controls.head.position.copy(head);this.controls.head.quaternion.copy(hq);
    for(const side of ['left','right']){
      const sign=side==='left'?1:-1,handKey=side+'Hand',footKey=side+'Foot',shoulder=offset(sign*.185,.405,0),hip=offset(sign*.095,0,0,pq);
      const hand=this.target(handKey),handQ=Q(st.rotations[handKey]),wrist=hand.clone().add(new THREE.Vector3(0,0,-.035*s).applyQuaternion(handQ));
      const arm=solveTwoBone(shoulder,wrist,.282*s,.255*s,new THREE.Vector3(sign*.45,0,-1).applyQuaternion(tq),st.swivel[handKey]);
      const toe=this.target(footKey),footQ=Q(st.rotations[footKey]),ankle=toe.clone().add(new THREE.Vector3(0,.055*s,-.14*s).applyQuaternion(footQ));
      const leg=solveTwoBone(hip,ankle,.445*s,.435*s,new THREE.Vector3(0,0,1).applyQuaternion(pq),st.swivel[footKey]);
      this.blob(side+'Shoulder',shoulder,[.068*s,.071*s,.07*s]);this.blob(side+'Hip',hip,[.07*s,.072*s,.07*s]);
      this.segment(side+'UpperArm',shoulder,arm.joint,.046*s);this.segment(side+'Forearm',arm.joint,arm.end,.038*s);
      this.blob(side+'Elbow',arm.joint,[.044*s,.044*s,.044*s]);this.blob(handKey,arm.end.clone().add(new THREE.Vector3(0,0,.035*s).applyQuaternion(handQ)),[.041*s,.033*s,.066*s],handQ);
      this.segment(side+'Thigh',hip,leg.joint,.067*s);this.segment(side+'Shin',leg.joint,leg.end,.047*s);this.blob(side+'Knee',leg.joint,[.058*s,.058*s,.058*s]);
      this.blob(footKey,leg.end.clone().add(new THREE.Vector3(0,-.025*s,.025*s).applyQuaternion(footQ)),[.055*s,.048*s,.151*s],footQ);
      for(const [key,pos,q]of [[handKey,hand,handQ],[footKey,toe,footQ],[side+'Elbow',arm.joint,new THREE.Quaternion()],[side+'Knee',leg.joint,new THREE.Quaternion()]]){this.controls[key].position.copy(pos);this.controls[key].quaternion.copy(q);}
      this.frames[handKey]={position:hand,quaternion:handQ};
      this.frames[footKey]={position:toe,quaternion:Q([0,st.rotations[footKey][1],st.rotations[footKey][2]])};
      this.limbs[handKey]={...arm,start:shoulder,target:wrist,a:.282*s,b:.255*s};this.limbs[footKey]={...leg,start:hip,target:ankle,a:.445*s,b:.435*s};
      if(arm.limited)this.warnings.push(side==='left'?'Левая рука не дотягивается':'Правая рука не дотягивается');if(leg.limited)this.warnings.push(side==='left'?'Левая нога не дотягивается':'Правая нога не дотягивается');
    }
    this.updateMatrixWorld(true);
  }
  frameWorld(key){this.updateWorldMatrix(true,false);const f=this.frames[key],q=new THREE.Quaternion();this.getWorldQuaternion(q);return {position:f.position.clone().applyMatrix4(this.matrixWorld),quaternion:q.multiply(f.quaternion)};}
  setTargetWorld(key,p,q){this.updateWorldMatrix(true,false);const point=this.worldToLocal(p.clone());this.setTarget(key,point);if(q){const rootQ=this.getWorldQuaternion(new THREE.Quaternion()).invert();const e=new THREE.Euler().setFromQuaternion(rootQ.multiply(q),'XYZ');this.state.rotations[key]=[e.x/D,e.y/D,e.z/D];}this.update();}
  applyControl(key,rotation=false){
    const node=this.controls[key],st=this.state,s=st.height/175;
    if(key==='pelvis'){st.pelvis=node.position.toArray().map(n=>n/s);st.pelvisRot=[node.rotation.x/D,node.rotation.y/D,node.rotation.z/D];}
    else if(key==='torso'||key==='head'){
      const base=key==='torso'?Q(st.pelvisRot):Q(st.pelvisRot).multiply(Q(st.torso));const local=base.invert().multiply(node.quaternion);const e=new THREE.Euler().setFromQuaternion(local);st[key]=[e.x/D,e.y/D,e.z/D];
    }else if(TARGETS.includes(key)){this.setTarget(key,node.position);st.rotations[key]=[node.rotation.x/D,node.rotation.y/D,node.rotation.z/D];}
    else{
      const targetKey=key.replace('Elbow','Hand').replace('Knee','Foot'),limb=this.limbs[targetKey],axis=limb.target.clone().sub(limb.start).normalize();const desired=node.position.clone().sub(limb.start),previous=limb.joint.clone().sub(limb.start);desired.addScaledVector(axis,-desired.dot(axis));previous.addScaledVector(axis,-previous.dot(axis));if(desired.lengthSq()>1e-8&&previous.lengthSq()>1e-8){desired.normalize();previous.normalize();const angle=Math.atan2(axis.dot(previous.clone().cross(desired)),previous.dot(desired))/D;st.swivel[targetKey]=THREE.MathUtils.clamp(st.swivel[targetKey]+angle,-180,180);}
    }
    this.update();
  }
  setBend(key,degrees){const limb=this.limbs[key];if(!limb)return;const distance=Math.sqrt(limb.a*limb.a+limb.b*limb.b+2*limb.a*limb.b*Math.cos(degrees*D)),target=limb.start.clone().add(limb.target.clone().sub(limb.start).normalize().multiplyScalar(distance));const offset=this.target(key).sub(limb.target);this.setTarget(key,target.add(offset));this.update();}
  getBounds(){this.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(this.body);}
}
