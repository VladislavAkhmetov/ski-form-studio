import * as THREE from 'three';
import {defaultHuman} from './human.js?v=6';
import {emptyLinks,setWorldTransform} from './attachments.js?v=6';
export const HUMAN_POSES=[
 {id:'classic',name:'Классический шаг',hint:'Попеременный двухшажный',group:'classic'},
 {id:'double',name:'Одновременный бесшажный',hint:'Даблполинг, наклон вперёд',group:'classic'},
 {id:'classic_kick',name:'Одновременный одношажный',hint:'Толчок ногой с выносом палок',group:'classic'},
 {id:'classic_glide',name:'Прокат на лыже',hint:'Скольжение на опорной ноге',group:'classic'},
 {id:'herringbone',name:'Подъём «ёлочкой»',hint:'Шаг в гору, носки лыж врозь',group:'classic'},
 {id:'skate',name:'Коньковый толчок',hint:'Отталкивание ногой в сторону',group:'skate'},
 {id:'skate_v1',name:'Подъёмный ход (V1)',hint:'Асимметричный толчок в подъём',group:'skate'},
 {id:'skate_v2',name:'Равнинный ход (V2)',hint:'Мощный одновременный толчок',group:'skate'},
 {id:'skate_glide',name:'Коньковый прокат',hint:'Баланс и прокат на одной лыже',group:'skate'},
 {id:'skate_free',name:'Ход без палок',hint:'Скоростной коньковый шаг',group:'skate'},
 {id:'finish_lunge',name:'Финишный выпад',hint:'Бросок лыжи на финиш',group:'skate'},
 {id:'stand',name:'Спокойная стойка',hint:'На лыжах, с палками',group:'stances'},
 {id:'tuck',name:'Стойка спуска',hint:'Низкая аэродинамичная стойка',group:'stances'},
 {id:'lean',name:'Опора на лыжи',hint:'Лыжи вертикально, рука сверху',group:'lifestyle'},
 {id:'shoulder',name:'Лыжи на плече',hint:'Вместе с палками, в шаге',group:'lifestyle'},
 {id:'hug',name:'Лыжи перед собой',hint:'Держит двумя руками',group:'lifestyle'},
 {id:'yoke',name:'Палки за плечами',hint:'На лыжах, расслабленно',group:'lifestyle'},
 {id:'rest',name:'Отдых на палках',hint:'Руки на рукоятках',group:'lifestyle'},
 {id:'carry',name:'Лыжи в руке',hint:'В шаге, палки в другой руке',group:'lifestyle'},
 {id:'overhead',name:'Лыжи над головой',hint:'Победный жест',group:'lifestyle'}
];
const SHOULDER_TOP=.065;
export function humanPose(id,height=175){
  const h=defaultHuman();h.height=height;
  if(id==='stand'){h.pelvis=[.018,.955,0];h.pelvisRot=[0,-6,3];h.torso=[3,9,-3];h.head=[-4,-18,5];h.targets.leftFoot=[.12,.035,.15];h.targets.rightFoot=[-.115,.035,.07];h.rotations.leftFoot=[0,4,0];h.rotations.rightFoot=[0,-6,0];h.targets.leftHand=[.26,1.04,.17];h.targets.rightHand=[-.24,1.12,.31];}
  if(id==='classic'){h.pelvis=[0,.885,0];h.torso=[16,0,0];h.targets.leftFoot=[.11,.035,.36];h.targets.rightFoot=[-.11,.035,-.35];h.targets.leftHand=[.25,1.15,-.10];h.targets.rightHand=[-.25,.88,.40];h.rotations.rightFoot=[25,0,0];}
  if(id==='double'){h.pelvis=[0,.83,-.04];h.torso=[42,0,0];h.targets.leftHand=[.28,1.1,.64];h.targets.rightHand=[-.28,1.1,.64];}
  if(id==='classic_kick'){h.pelvis=[0,.85,-.02];h.torso=[24,0,0];h.targets.leftFoot=[.11,.035,.28];h.targets.rightFoot=[-.11,.035,-.36];h.rotations.rightFoot=[28,0,0];h.targets.leftHand=[.24,1.15,.45];h.targets.rightHand=[-.24,1.15,.45];}
  if(id==='classic_glide'){h.pelvis=[.04,.88,0];h.torso=[18,0,-4];h.head=[-8,0,0];h.targets.leftFoot=[.08,.035,.15];h.targets.rightFoot=[-.08,.18,-.45];h.rotations.rightFoot=[25,0,0];h.targets.leftHand=[.22,1.05,.25];h.targets.rightHand=[-.22,1.08,.30];}
  if(id==='herringbone'){h.pelvis=[0,.86,0];h.torso=[22,0,0];h.targets.leftFoot=[.18,.035,.22];h.targets.rightFoot=[-.18,.035,-.22];h.rotations.leftFoot=[0,22,0];h.rotations.rightFoot=[26,-22,0];h.targets.leftHand=[.32,1.08,-.05];h.targets.rightHand=[-.32,1.15,.25];}
  if(id==='skate'){h.pelvis=[0,.86,0];h.torso=[18,0,8];h.targets.leftFoot=[.38,.035,-.12];h.targets.rightFoot=[-.18,.035,.23];h.rotations.leftFoot=[15,24,0];h.rotations.rightFoot=[0,-14,0];h.targets.leftHand=[.31,1.16,.40];h.targets.rightHand=[-.31,1.14,.36];}
  if(id==='skate_v1'){h.pelvis=[-.03,.85,0];h.torso=[20,-4,6];h.targets.leftFoot=[.32,.035,-.16];h.targets.rightFoot=[-.15,.035,.24];h.rotations.leftFoot=[10,20,0];h.rotations.rightFoot=[0,-15,0];h.targets.leftHand=[.30,1.05,.28];h.targets.rightHand=[-.28,1.18,.42];}
  if(id==='skate_v2'){h.pelvis=[0,.82,-.04];h.torso=[30,0,4];h.targets.leftFoot=[.34,.035,-.15];h.targets.rightFoot=[-.16,.035,.20];h.rotations.leftFoot=[16,22,0];h.rotations.rightFoot=[0,-12,0];h.targets.leftHand=[.25,1.14,.46];h.targets.rightHand=[-.25,1.14,.46];}
  if(id==='skate_glide'){h.pelvis=[-.05,.87,0];h.torso=[18,0,-6];h.targets.leftFoot=[.24,.14,-.36];h.targets.rightFoot=[-.14,.035,.18];h.rotations.leftFoot=[18,22,0];h.rotations.rightFoot=[0,-14,0];h.targets.leftHand=[.24,1.08,.32];h.targets.rightHand=[-.24,1.08,.32];}
  if(id==='skate_free'){h.pelvis=[0,.80,-.06];h.torso=[34,0,0];h.targets.leftFoot=[.38,.035,-.10];h.targets.rightFoot=[-.16,.035,.20];h.rotations.leftFoot=[16,24,0];h.rotations.rightFoot=[0,-14,0];h.targets.leftHand=[.22,.92,.30];h.targets.rightHand=[-.22,.88,-.15];h.rotations.leftHand=[-20,0,0];h.rotations.rightHand=[-20,0,0];}
  if(id==='finish_lunge'){h.pelvis=[0,.76,-.05];h.torso=[34,0,0];h.targets.leftFoot=[.12,.035,.46];h.targets.rightFoot=[-.12,.035,-.44];h.rotations.rightFoot=[36,0,0];h.targets.leftHand=[.26,.96,-.28];h.targets.rightHand=[-.26,.96,-.28];h.rotations.leftHand=[-40,0,0];h.rotations.rightHand=[-40,0,0];}
  if(id==='tuck'){h.pelvis=[0,.68,-.13];h.torso=[45,0,0];h.targets.leftFoot=[.15,.035,.20];h.targets.rightFoot=[-.15,.035,.20];h.targets.leftHand=[.28,.76,.45];h.targets.rightHand=[-.28,.76,.45];}
  // Walking to the track: skis carried at the side, poles swinging in the other hand.
  if(id==='carry'){h.pelvis=[0,.925,.02];h.pelvisRot=[0,-9,-2];h.torso=[4,11,3];h.head=[-3,26,-3];h.targets.leftFoot=[.1,.035,.29];h.targets.rightFoot=[-.1,.035,-.22];h.rotations.leftFoot=[0,6,0];h.rotations.rightFoot=[28,0,0];h.targets.rightHand=[-.29,.82,.07];h.rotations.rightHand=[0,0,-90];h.targets.leftHand=[.23,.97,.24];h.rotations.leftHand=[-30,0,90];}
  // Celebration: the set raised overhead, leaning back, one foot kicked up on the toe.
  if(id==='overhead'){h.pelvis=[0,.95,.02];h.pelvisRot=[0,6,3];h.torso=[-11,-6,-2];h.head=[-20,-8,4];h.targets.leftFoot=[.13,.035,.08];h.targets.rightFoot=[-.12,.035,-.16];h.rotations.rightFoot=[34,-8,0];h.targets.leftHand=[.3,1.8,.04];h.targets.rightHand=[-.3,1.74,.04];h.rotations.leftHand=[90,0,0];h.rotations.rightHand=[90,0,0];}
  // Weight on the left leg, hip lifted, right hand resting on vertical skis.
  if(id==='lean'){h.pelvis=[.035,.95,0];h.pelvisRot=[0,-10,5];h.torso=[2,14,-8];h.head=[-4,-22,7];h.targets.leftFoot=[.09,.035,.08];h.targets.rightFoot=[-.2,.035,.17];h.rotations.leftFoot=[0,8,0];h.rotations.rightFoot=[12,-22,0];h.swivel.rightFoot=-10;h.targets.rightHand=[-.27,1.38,.12];h.rotations.rightHand=[0,-70,-90];h.swivel.rightHand=35;h.targets.leftHand=[.2,.99,-.04];h.rotations.leftHand=[0,90,-20];h.swivel.leftHand=-70;}
  // Walking with the skis and poles on the right shoulder, glancing toward the camera.
  if(id==='shoulder'){h.pelvis=[0,.93,.02];h.pelvisRot=[0,8,0];h.torso=[3,-10,-2];h.head=[-3,24,2];h.targets.leftFoot=[.1,.035,.3];h.targets.rightFoot=[-.11,.035,-.2];h.rotations.rightFoot=[24,0,0];h.targets.leftHand=[.23,.87,-.1];h.rotations.leftHand=[-10,0,0];h.targets.rightHand=[-.24,1.32,.3];h.rotations.rightHand=[0,0,-90];h.swivel.rightHand=60;}
  // Skis standing in front, held with both hands, relaxed weight shift.
  if(id==='hug'){h.pelvis=[-.025,.95,-.02];h.pelvisRot=[0,6,-4];h.torso=[4,-6,5];h.head=[-2,8,-8];h.targets.leftFoot=[.16,.035,.14];h.targets.rightFoot=[-.09,.035,.05];h.rotations.leftFoot=[8,18,0];h.targets.leftHand=[-.06,1.38,.3];h.rotations.leftHand=[0,-90,90];h.targets.rightHand=[-.15,1.12,.3];h.rotations.rightHand=[0,90,-90];h.swivel.rightHand=30;h.swivel.leftHand=-30;}
  // On skis, poles across the shoulders behind the neck, wrists draped over them.
  if(id==='yoke'){h.pelvis=[0,.955,0];h.pelvisRot=[0,0,2];h.torso=[-5,4,-2];h.head=[-10,-12,4];h.targets.leftFoot=[.13,.035,.1];h.targets.rightFoot=[-.13,.035,.06];h.targets.leftHand=[.45,1.48,-.05];h.rotations.leftHand=[0,0,90];h.targets.rightHand=[-.45,1.48,-.05];h.rotations.rightHand=[0,0,-90];h.swivel.leftHand=-60;h.swivel.rightHand=60;}
  // On skis, leaning on both poles planted in front, hands stacked on the grips.
  if(id==='rest'){h.pelvis=[0,.93,-.03];h.torso=[9,0,0];h.head=[-12,0,0];h.targets.leftFoot=[.12,.035,.1];h.targets.rightFoot=[-.12,.035,.04];h.targets.leftHand=[.04,1.27,.36];h.rotations.leftHand=[90,0,0];h.targets.rightHand=[-.04,1.22,.36];h.rotations.rightHand=[90,0,0];h.swivel.leftHand=-40;h.swivel.rightHand=40;}
  return h;
}

const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
// Quaternion whose local +Z follows `along` and local +Y (ski top / pole front) follows `face`.
function orient(along,face){const z=along.clone().normalize(),y=face.clone().addScaledVector(z,-face.dot(z));if(y.lengthSq()<1e-8)y.set(0,0,1).addScaledVector(z,-z.z);y.normalize();const x=y.clone().cross(z);return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));}
// Two skis held base to base: the first faces `face`, the second faces away from it.
function skiPair(center,along,face){const f=face.clone().addScaledVector(along.clone().normalize(),-face.dot(along.clone().normalize())).normalize();return [{position:center.clone().addScaledVector(f,.002),quaternion:orient(along,f)},{position:center.clone().addScaledVector(f,-.002),quaternion:orient(along,f.clone().negate())}];}

/** Places the four gear items for a pose, adjusting grasping hands to the equipment. Positions are in the human's local frame. */
function lifestyleGear(id,human,config){
  const s=human.state.height/175,L=config.skiLength/100,P=config.poleLength/100,grip=P/2-.07,up=v(0,1,0),out=[];
  const shoulder=side=>human.parts[side+'Shoulder'].position.clone();
  const hands={};
  if(id==='lean'){
    const along=v(.07,1,0).normalize(),base=v(-.43*s,.004,.13*s),center=base.clone().addScaledVector(along,L/2);
    out.push(...skiPair(center,along,v(0,0,1)));
    const atHand=base.clone().addScaledVector(along,Math.min(L-.08,1.38*s)/along.y);
    hands.rightHand=atHand.clone().add(v(.045,0,0));
    for(const dz of [-.035,-.055]){const pb=v(-.47*s,.003,.13*s+dz),pc=pb.clone().addScaledVector(along,P/2);out.push({position:pc,quaternion:orient(along,v(1,0,0))});}
  }
  if(id==='shoulder'){
    const along=v(0,-Math.sin(16*Math.PI/180),Math.cos(16*Math.PI/180)),lift=up.clone().addScaledVector(along,-along.y).normalize(),top=shoulder('right').add(v(-.012*s,SHOULDER_TOP*s,0));
    const skiCenter=top.clone().addScaledVector(lift,config.skiWidth/200).addScaledVector(along,-.04);
    out.push(...skiPair(skiCenter,along,v(1,0,0)));
    const reach=.34*s,handAt=top.clone().addScaledVector(along,reach);
    hands.rightHand=handAt.clone().add(v(-.035*s,.005,0));
    for(const dx of [-.009,.009]){const g=top.clone().addScaledVector(lift,config.skiWidth/100+.012).addScaledVector(along,reach+.1).add(v(dx,0,0));out.push({position:g.addScaledVector(along,-grip),quaternion:orient(along,lift)});}
  }
  if(id==='hug'){
    const along=v(-.03,1,-.04).normalize(),base=v(-.2*s,.004,.36*s),center=base.clone().addScaledVector(along,L/2);
    out.push(...skiPair(center,along,v(0,0,1)));
    const at=y=>base.clone().addScaledVector(along,Math.min(L-.06,y*s)/along.y);
    hands.leftHand=at(1.3).add(v(.05,0,-.01));hands.rightHand=at(1.02).add(v(-.05,0,-.01));
    for(const dx of [-.075,-.095]){const pb=v(-.2*s+dx,.003,.34*s),pc=pb.clone().addScaledVector(along,P/2);out.push({position:pc,quaternion:orient(along,v(0,0,1))});}
  }
  if(id==='carry'){
    const along=v(0,Math.sin(9*Math.PI/180),Math.cos(9*Math.PI/180)),lift=up.clone().addScaledVector(along,-along.y).normalize(),hand=v(-.29*s,.82*s,.07*s);
    hands.rightHand=hand;
    out.push(...skiPair(hand.clone().add(v(-.03*s,0,0)).addScaledVector(lift,-(config.skiWidth/200+.012)).addScaledVector(along,.06),along,v(1,0,0)));
    const lh=v(.23*s,.97*s,.24*s),ay=Math.min(.5,(lh.y-.06)/(P-.07)),pa=v(0,ay,Math.sqrt(1-ay*ay));hands.leftHand=lh;
    for(const dx of [-.009,.009]){const g=lh.clone().add(v(.012+dx,0,0));out.push({position:g.addScaledVector(pa,-grip),quaternion:orient(pa,v(1,0,0))});}
  }
  if(id==='overhead'){
    const t=8*Math.PI/180,along=v(Math.cos(t),Math.sin(t),0),lift=up.clone().addScaledVector(along,-along.y).normalize(),c=v(0,1.8*s,0);
    out.push(...skiPair(c,along,v(0,0,1)));
    const grip=w=>c.clone().addScaledVector(along,w*.27*s).addScaledVector(lift,-(config.skiWidth/200+.016));
    hands.leftHand=grip(1);hands.rightHand=grip(-1);
    for(const dz of [.02,.034]){const pc=c.clone().add(v(0,.012,dz));out.push({position:pc,quaternion:orient(dz<.03?along:along.clone().negate(),v(0,0,1))});}
  }
  if(id==='yoke'||id==='rest'){
    out.push(null,null); // skis stay on the feet
    if(id==='yoke'){const mid=shoulder('left').add(shoulder('right')).multiplyScalar(.5),y=mid.y+(SHOULDER_TOP+.02)*s,z=mid.z-.075*s;for(const [side,dz,dy] of [[1,0,0],[-1,-.004,.022]]){const c=v(-side*.06*s,y+dy,z+dz);out.push({position:c,quaternion:orient(v(side,0,0),v(0,0,1))});}hands.leftHand=v(.45*s,y+.045,z+.005);hands.rightHand=v(-.45*s,y+.065,z+.005);}
    else{const top=v(0,1.2*s,.5*s);for(const side of [1,-1]){const h=top.clone().add(v(side*.025,0,0)),tipX=side*.24,flat=P*P-h.y*h.y-(h.x-tipX)**2,tip=v(tipX,0,h.z+Math.sqrt(Math.max(.0001,flat))),along=h.clone().sub(tip).normalize(),c=h.clone().addScaledVector(along,-P/2+.005);out.push({position:c,quaternion:orient(along,v(0,1,0))});}hands.leftHand=top.clone().add(v(.012,.065,-.01));hands.rightHand=top.clone().add(v(-.012,.02,-.01));}
  }
  return {gear:out,hands};
}
// Elbow direction preferences: hanging down and slightly out, or akimbo (out and back).
const ELBOWS={lean:{leftHand:'akimbo'}};
function relaxElbow(human,key,mode){const sign=key.startsWith('left')?1:-1,prefer=mode==='akimbo'?v(sign,-.25,-.7):v(sign*.35,-1,-.12);prefer.normalize();let best=0,score=-Infinity;for(let a=-180;a<=180;a+=5){human.state.swivel[key]=a;human.update();const l=human.limbs[key],d=l.joint.clone().sub(l.start).normalize().dot(prefer);if(d>score){score=d;best=a;}}human.state.swivel[key]=best;human.update();}
export const LIFESTYLE_LINKS={carry:['rightHand','rightHand','leftHand','leftHand'],overhead:['rightHand','rightHand','leftHand','leftHand'],lean:['rightHand','rightHand','rightHand','rightHand'],shoulder:['rightHand','rightHand','rightHand','rightHand'],hug:['leftHand','leftHand','rightHand','rightHand'],yoke:['leftFoot','rightFoot','leftHand','rightHand'],rest:['leftFoot','rightFoot','leftHand','rightHand']};

/** Applies the pose's equipment layout: grasped gear follows the hand, worn skis follow the feet. */
export function placeGear(id,human,gear,attachments,config){
  attachments.links=emptyLinks();human.update();
  const al=(i,t,o)=>attachments.align(i,t,o);
  if(!LIFESTYLE_LINKS[id]){const plant=!['tuck','skate_free','finish_lunge'].includes(id);al(0,'leftFoot');al(1,'rightFoot');al(2,'leftHand',{plant});al(3,'rightHand',{plant});return;}
  const {gear:layout,hands}=lifestyleGear(id,human,config);
  for(const [key,p] of Object.entries(hands))human.setTarget(key,p);human.update();for(const key of ['leftHand','rightHand'])relaxElbow(human,key,ELBOWS[id]?.[key]);
  human.update();human.updateWorldMatrix(true,false);const rootQ=human.getWorldQuaternion(new THREE.Quaternion());
  layout.forEach((item,i)=>{const target=LIFESTYLE_LINKS[id][i];if(!item){al(i,target);return;}setWorldTransform(gear[i],human.localToWorld(item.position.clone()),rootQ.clone().multiply(item.quaternion));attachments.capture(i,target);});
  attachments.follow();
}
