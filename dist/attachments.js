import * as THREE from 'three';
export const LINK_NAMES={free:'Свободно',leftFoot:'Левая стопа',rightFoot:'Правая стопа',leftHand:'Левая кисть',rightHand:'Правая кисть'};
export function emptyLinks(){return Array.from({length:4},()=>({target:'free',position:[0,0,0],quaternion:[0,0,0,1],tipGround:false,anchor:null}));}
const matrix=(p,q)=>new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1));
export function worldTransform(object){object.updateWorldMatrix(true,false);const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();object.matrixWorld.decompose(p,q,s);return {position:p,quaternion:q};}
export function setWorldTransform(object,p,q){object.parent?.updateWorldMatrix(true,false);const m=matrix(p,q);if(object.parent)m.premultiply(object.parent.matrixWorld.clone().invert());m.decompose(object.position,object.quaternion,object.scale);object.updateMatrixWorld(true);}
export class AttachmentSystem {
  constructor(gear,human,config,settings){this.gear=gear;this.human=human;this.config=config;this.settings=settings;this.links=emptyLinks();this.warnings=[];}
  capture(index,target){const o=this.gear[index],w=worldTransform(o);if(target==='free'){this.links[index]={...emptyLinks()[index]};return;}const f=this.human.frameWorld(target),relative=matrix(f.position,f.quaternion).invert().multiply(matrix(w.position,w.quaternion)),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();relative.decompose(p,q,s);this.links[index]={target,position:p.toArray(),quaternion:q.toArray(),tipGround:false,anchor:null};}
  align(index,target,{carry=false,plant=true}={}){
    if(target==='free'){this.capture(index,'free');return;}
    const f=this.human.frameWorld(target),q=f.quaternion.clone(),p=f.position.clone();
    if(index<2){
      if(target.includes('Foot'))p.sub(new THREE.Vector3(0,.035,.030).applyQuaternion(q));
      else{q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,Math.PI)));p.add(new THREE.Vector3(index===0?-.032:.032,-.04,0).applyQuaternion(f.quaternion));}
    }else{
      if(carry)q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)));
      else if(plant)q.multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(index===2?-.05:.05,.7,.71).normalize()));
      p.sub(this.gripPoint(carry?'shaft':'handle').applyQuaternion(q));
    }
    setWorldTransform(this.gear[index],p,q);this.capture(index,target);if(index>=2&&target.includes('Hand')){this.links[index].anchor=carry?'shaft':'handle';this.links[index].tipGround=!carry&&plant;}this.follow();
  }
  gripPoint(anchor){return new THREE.Vector3(0,.013,anchor==='shaft'?0:this.config.poleLength/200-.07);}
  follow(){
    this.warnings=[];if(!this.human.initialized)return;this.human.update();
    this.links.forEach((link,i)=>{
      if(link.target==='free')return;const f=this.human.frameWorld(link.target),q=f.quaternion.clone().multiply(new THREE.Quaternion().fromArray(link.quaternion)),p=new THREE.Vector3().fromArray(link.position).applyQuaternion(f.quaternion).add(f.position);
      if(i>=2&&link.anchor&&link.target.includes('Hand')){
        if(link.tipGround){const distance=this.config.poleLength/100-.07,ground=this.settings.floorEnabled?this.settings.floorY/100:0,vertical=(f.position.y-ground)/distance,dir=new THREE.Vector3(0,0,1).applyQuaternion(q),horiz=new THREE.Vector3(dir.x,0,dir.z);if(horiz.lengthSq()<1e-8)horiz.set(0,0,1);horiz.normalize();const vy=THREE.MathUtils.clamp(vertical,-.995,.995);horiz.multiplyScalar(Math.sqrt(1-vy*vy));dir.set(horiz.x,vy,horiz.z);q.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);if(vertical>.995||vertical<-.995)this.warnings.push('Палка не достаёт до земли: измените хват или её длину');}
        p.copy(f.position);if(link.anchor==='shaft')p.add(new THREE.Vector3(i===2?-.009:.009,0,0).applyQuaternion(f.quaternion));p.sub(this.gripPoint(link.anchor).applyQuaternion(q));
        const rel=matrix(f.position,f.quaternion).invert().multiply(matrix(p,q)),rp=new THREE.Vector3(),rq=new THREE.Quaternion(),sc=new THREE.Vector3();rel.decompose(rp,rq,sc);link.position=rp.toArray();link.quaternion=rq.toArray();
      }
      setWorldTransform(this.gear[i],p,q);
    });
  }
  driveFromGear(ids){
    if(!this.human.initialized)return;const driven=new Set();
    for(const i of ids){const link=this.links[i];if(!link||link.target==='free'||driven.has(link.target))continue;const w=worldTransform(this.gear[i]),frame=matrix(w.position,w.quaternion).multiply(matrix(new THREE.Vector3().fromArray(link.position),new THREE.Quaternion().fromArray(link.quaternion)).invert()),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();frame.decompose(p,q,s);const pitch=this.human.state.rotations[link.target][0];this.human.setTargetWorld(link.target,p,q);if(link.target.includes('Foot')){this.human.state.rotations[link.target][0]=pitch;this.human.update();}driven.add(link.target);}
    this.follow();
  }
}
