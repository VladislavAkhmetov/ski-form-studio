import {defaultHuman} from './human.js';
export const HUMAN_POSES=[
 {id:'stand',name:'Спокойная стойка',hint:'На лыжах, с палками'},
 {id:'classic',name:'Классический шаг',hint:'Одна нога впереди'},
 {id:'skate',name:'Коньковый толчок',hint:'Лыжи под углом'},
 {id:'double',name:'Двойной толчок',hint:'Наклон вперёд'},
 {id:'tuck',name:'Низкая стойка',hint:'Согнутые колени'},
 {id:'carry',name:'Лыжи в руке',hint:'Вертикальный комплект'}
];
export function humanPose(id,height=175){
  const h=defaultHuman();h.height=height;
  if(id==='classic'){h.pelvis=[0,.885,0];h.torso=[16,0,0];h.targets.leftFoot=[.11,.035,.36];h.targets.rightFoot=[-.11,.035,-.35];h.targets.leftHand=[.25,1.15,-.10];h.targets.rightHand=[-.25,.88,.40];h.rotations.rightFoot=[25,0,0];}
  if(id==='skate'){h.pelvis=[0,.86,0];h.torso=[18,0,8];h.targets.leftFoot=[.38,.035,-.12];h.targets.rightFoot=[-.18,.035,.23];h.rotations.leftFoot=[15,24,0];h.rotations.rightFoot=[0,-14,0];h.targets.leftHand=[.31,1.16,.40];h.targets.rightHand=[-.31,1.14,.36];}
  if(id==='double'){h.pelvis=[0,.83,-.04];h.torso=[42,0,0];h.targets.leftHand=[.28,1.1,.64];h.targets.rightHand=[-.28,1.1,.64];}
  if(id==='tuck'){h.pelvis=[0,.68,-.13];h.torso=[45,0,0];h.targets.leftFoot=[.15,.035,.20];h.targets.rightFoot=[-.15,.035,.20];h.targets.leftHand=[.28,.76,.45];h.targets.rightHand=[-.28,.76,.45];}
  if(id==='carry'){h.targets.leftHand=[.24,1.02,.15];h.targets.rightHand=[-.28,1.05,.12];}
  return h;
}
