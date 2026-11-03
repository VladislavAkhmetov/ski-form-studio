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

export function limbBasis(start,target,joint){
  const delta=target.clone().sub(start),len=delta.length(),axis=len>1e-7?delta.multiplyScalar(1/len):new THREE.Vector3(0,-1,0);
  let r=joint.clone().sub(start);
  r.addScaledVector(axis,-r.dot(axis));
  const radius=r.length();
  let radial=radius>1e-4?r.clone().multiplyScalar(1/radius):new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
  if(radial.lengthSq()<1e-4)radial=new THREE.Vector3(1,0,0);
  const tangent=axis.clone().cross(radial).normalize();
  const m=new THREE.Matrix4().makeBasis(tangent,radial,axis.clone().negate());
  return {q:new THREE.Quaternion().setFromRotationMatrix(m),tangent,radius:Math.max(radius,.05)};
}

export class HumanRig extends THREE.Group {
  constructor(){
    super();this.name='Манекен';this.userData={kind:'human',id:4};this.state=defaultHuman();this.initialized=false;this.visible=false;
    this.body=new THREE.Group();this.add(this.body);this.helpers=new THREE.Group();this.helpers.visible=false;this.add(this.helpers);
    this.materials={body:new THREE.MeshStandardMaterial({color:'#b3b1ab',roughness:.82}),joint:new THREE.MeshStandardMaterial({color:'#b3b1ab',roughness:.82}),boot:new THREE.MeshStandardMaterial({color:'#4a4d50',roughness:.8})};
    this.sphere=new THREE.SphereGeometry(1,24,16);this.cylinder=new THREE.CylinderGeometry(1,1,1,14);
    const lathe=pts=>new THREE.LatheGeometry(pts.map(([r,u])=>new THREE.Vector2(r,u-.5)),22);
    this.limbShapes={UpperArm:lathe([[.92,0],[1,.18],[.94,.55],[.8,1]]),Forearm:lathe([[.95,0],[1,.16],[.86,.55],[.68,1]]),Thigh:lathe([[.98,0],[1,.12],[.9,.55],[.7,1]]),Shin:lathe([[.84,0],[1,.22],[.86,.5],[.58,.88],[.56,1]])};
    this.parts={};this.controls={};this.frames={};this.limbs={};this.warnings=[];
    const labels=['pelvis','waist','chest','girdle','neck','head','nose','leftThumb','rightThumb','leftSole','rightSole','leftCuff','rightCuff','leftShoulder','rightShoulder','leftHip','rightHip','leftElbow','rightElbow','leftKnee','rightKnee','leftHand','rightHand','leftFoot','rightFoot'];
    const side=name=>name.startsWith('left')?'left':'right';
    for(const name of labels){const mat=/Foot|Sole|Cuff|Hand|Thumb/.test(name)?this.materials.boot:/Elbow|Knee|Shoulder|Hip|neck/.test(name)?this.materials.joint:this.materials.body;const m=new THREE.Mesh(this.sphere,mat);m.castShadow=true;m.receiveShadow=true;m.userData.control=['chest','waist','girdle'].includes(name)?'torso':['nose','neck'].includes(name)?'head':name.endsWith('Shoulder')||name.endsWith('Thumb')?side(name)+'Hand':name.endsWith('Sole')||name.endsWith('Cuff')?side(name)+'Foot':name.endsWith('Hip')?'pelvis':name;this.body.add(m);this.parts[name]=m;}
    // Small overlapping details self-shadow into jagged seams; they only receive light.
    for(const name of ['nose','leftThumb','rightThumb'])this.parts[name].castShadow=false;
    for(const name of ['leftUpperArm','leftForearm','rightUpperArm','rightForearm','leftThigh','leftShin','rightThigh','rightShin']){const m=new THREE.Mesh(this.limbShapes[name.replace(/^(left|right)/,'')],this.materials.body);m.castShadow=true;m.receiveShadow=true;m.userData.control=name.includes('Arm')||name.includes('Forearm')?name.startsWith('left')?'leftHand':'rightHand':name.startsWith('left')?'leftFoot':'rightFoot';this.body.add(m);this.parts[name]=m;}
    const colors={pelvis:0xd39836,torso:0xd39836,head:0xd39836,leftHand:0x3d83c6,rightHand:0x3d83c6,leftFoot:0x789344,rightFoot:0x789344,leftElbow:0x969fa8,rightElbow:0x969fa8,leftKnee:0x969fa8,rightKnee:0x969fa8};
    for(const key of Object.keys(CONTROL_NAMES)){const c=new THREE.Group();c.name=CONTROL_NAMES[key];c.userData.control=key;const dot=new THREE.Mesh(new THREE.SphereGeometry(.018,12,8),new THREE.MeshBasicMaterial({color:colors[key],depthTest:false,transparent:true,opacity:.9}));dot.renderOrder=10;dot.userData.control=key;c.add(dot);this.helpers.add(c);this.controls[key]=c;}
    this.update();
  }
  setTone(tone){const palette=tone==='white'?['#e4e3de','#e4e3de','#73767a']:tone==='graphite'?['#6d7074','#6d7074','#2f3236']:['#b3b1ab','#b3b1ab','#4a4d50'];Object.values(this.materials).forEach((m,i)=>m.color.set(palette[i]));}
  blob(name,p,size,q=new THREE.Quaternion()){const m=this.parts[name];m.position.copy(p);m.scale.set(...size);m.quaternion.copy(q);}
  segment(name,a,b,r){const m=this.parts[name],d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
  target(key){const p=V(this.state.targets[key]),s=this.state.height/175;p.x*=s;p.z*=s;if(!key.includes('Foot'))p.y*=s;return p;}
  setTarget(key,p){const s=this.state.height/175;this.state.targets[key]=[p.x/s,key.includes('Foot')?p.y:p.y/s,p.z/s];}
  update(){
    const st=this.state,s=st.height/175,pelvis=V(st.pelvis).multiplyScalar(s),pq=Q(st.pelvisRot),tq=pq.clone().multiply(Q(st.torso)),hq=tq.clone().multiply(Q(st.head));this.warnings=[];
    const offset=(x,y,z,q=tq)=>new THREE.Vector3(x*s,y*s,z*s).applyQuaternion(q).add(pelvis);
    this.blob('pelvis',offset(0,.015,0,pq),[.16*s,.115*s,.105*s],pq);
    this.blob('waist',offset(0,.165,.004),[.13*s,.175*s,.095*s],tq);
    this.blob('chest',offset(0,.31,.006),[.17*s,.19*s,.112*s],tq);
    this.blob('girdle',offset(0,.425,-.012),[.175*s,.062*s,.085*s],tq);
    this.blob('neck',offset(0,.5,-.004),[.056*s,.085*s,.054*s],tq);
    const head=offset(0,.655,0);this.blob('head',head,[.079*s,.112*s,.097*s],hq);this.blob('nose',head.clone().add(new THREE.Vector3(0,-.014*s,.095*s).applyQuaternion(hq)),[.01*s,.019*s,.016*s],hq);
    this.controls.pelvis.position.copy(pelvis);this.controls.pelvis.quaternion.copy(pq);this.controls.torso.position.copy(offset(0,.26,0));this.controls.torso.quaternion.copy(tq);this.controls.head.position.copy(head);this.controls.head.quaternion.copy(hq);
    for(const side of ['left','right']){
      const sign=side==='left'?1:-1,handKey=side+'Hand',footKey=side+'Foot',shoulder=offset(sign*.185,.405,0),hip=offset(sign*.095,0,0,pq);
      const hand=this.target(handKey),handQ=Q(st.rotations[handKey]),wrist=hand.clone().add(new THREE.Vector3(0,0,-.035*s).applyQuaternion(handQ));
      const arm=solveTwoBone(shoulder,wrist,.282*s,.255*s,new THREE.Vector3(sign*.45,0,-1).applyQuaternion(tq),st.swivel[handKey]);
      const toe=this.target(footKey),footQ=Q(st.rotations[footKey]),ankle=toe.clone().add(new THREE.Vector3(0,.055*s,-.14*s).applyQuaternion(footQ));
      const leg=solveTwoBone(hip,ankle,.445*s,.435*s,new THREE.Vector3(0,0,1).applyQuaternion(pq),st.swivel[footKey]);
      this.blob(side+'Shoulder',shoulder,[.058*s,.06*s,.06*s],tq);this.blob(side+'Hip',hip,[.074*s,.08*s,.076*s],pq);
      this.segment(side+'UpperArm',shoulder,arm.joint,.05*s);this.segment(side+'Forearm',arm.joint,arm.end,.044*s);
      this.blob(side+'Elbow',arm.joint,[.041*s,.041*s,.041*s]);
      const palm=arm.end.clone().add(new THREE.Vector3(0,0,.04*s).applyQuaternion(handQ));this.blob(handKey,palm,[.042*s,.031*s,.07*s],handQ);this.blob(side+'Thumb',palm.clone().add(new THREE.Vector3(-sign*.034*s,.012*s,-.012*s).applyQuaternion(handQ)),[.015*s,.014*s,.032*s],handQ.clone().multiply(Q([0,-sign*25,0])));
      this.segment(side+'Thigh',hip,leg.joint,.078*s);this.segment(side+'Shin',leg.joint,leg.end,.056*s);this.blob(side+'Knee',leg.joint,[.053*s,.053*s,.053*s]);
      const boot=leg.end.clone().add(new THREE.Vector3(0,-.022*s,.03*s).applyQuaternion(footQ));this.blob(footKey,boot,[.05*s,.042*s,.142*s],footQ);this.blob(side+'Sole',boot.clone().add(new THREE.Vector3(0,-.03*s,.004*s).applyQuaternion(footQ)),[.054*s,.014*s,.152*s],footQ);this.blob(side+'Cuff',leg.end.clone().add(new THREE.Vector3(0,.012*s,0)),[.042*s,.055*s,.046*s],footQ);
      const armBasis=limbBasis(shoulder,wrist,arm.joint),legBasis=limbBasis(hip,ankle,leg.joint);
      for(const [key,pos,q]of [[handKey,hand,handQ],[footKey,toe,footQ],[side+'Elbow',arm.joint,armBasis.q],[side+'Knee',leg.joint,legBasis.q]]){this.controls[key].position.copy(pos);this.controls[key].quaternion.copy(q);}
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
      const targetKey=key.replace('Elbow','Hand').replace('Knee','Foot'),limb=this.limbs[targetKey];
      const basis=limbBasis(limb.start,limb.target,limb.joint);
      const delta=node.position.clone().sub(limb.joint);
      const dX=delta.dot(basis.tangent);
      const dAngle=(dX/basis.radius)/D;
      if(Math.abs(dAngle)>1e-5){
        st.swivel[targetKey]=THREE.MathUtils.clamp(st.swivel[targetKey]+dAngle,-180,180);
      }
    }
    this.update();
  }
  setBend(key,degrees){const limb=this.limbs[key];if(!limb)return;const distance=Math.sqrt(limb.a*limb.a+limb.b*limb.b+2*limb.a*limb.b*Math.cos(degrees*D)),target=limb.start.clone().add(limb.target.clone().sub(limb.start).normalize().multiplyScalar(distance));const offset=this.target(key).sub(limb.target);this.setTarget(key,target.add(offset));this.update();}
  getBounds(){this.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(this.body);}
}
