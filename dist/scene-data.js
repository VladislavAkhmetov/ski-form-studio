import {defaultHuman} from './human.js';
import {emptyLinks,LINK_NAMES} from './attachments.js';
export const DEFAULT_SETTINGS=Object.freeze({ratio:'3:4',resolution:2048,background:'white',shadow:true,grid:false,material:'clay',light:100,focal:70,projection:'perspective',floorEnabled:false,floorExport:true,floorGrid:true,floorWidth:120,floorLength:240,floorY:-.5});
const vec=(v,len,max=100)=>Array.isArray(v)&&v.length===len&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=max);
const quat=v=>vec(v,4,1.01)&&Math.abs(v.reduce((s,n)=>s+n*n,0)-1)<.02;
const bool=(v)=>typeof v==='boolean';
export function validateScene(d){
  if(!d||![1,2].includes(d.version)||!d.config||!d.settings||!Array.isArray(d.objects)||d.objects.length!==4)throw Error('Нужен файл сцены Ski Form');
  for(const [k,min,max]of [['skiLength',120,210],['skiWidth',3.8,8],['tipRise',2,12],['poleLength',90,180]])if(!Number.isFinite(d.config[k])||d.config[k]<min||d.config[k]>max)throw Error('Недопустимые размеры инвентаря');
  for(const k of ['bindings','straps'])if(!bool(d.config[k]))throw Error('Неверная настройка инвентаря');
  if('bindingStyle'in d.config&&!['nnn','block'].includes(d.config.bindingStyle))throw Error('Неизвестный тип крепления');
  const s=d.settings;
  if(!['1:1','3:4','4:3','9:16'].includes(s.ratio)||![1024,2048,4096].includes(s.resolution)||!['white','gray','transparent'].includes(s.background)||!['clay','white','graphite'].includes(s.material)||!['perspective','orthographic'].includes(s.projection))throw Error('Неверные параметры кадра');
  for(const [k,min,max]of [['light',50,150],['focal',28,120],['floorWidth',60,600],['floorLength',60,600],['floorY',-1000,1000]])if((k in s)&&(!Number.isFinite(s[k])||s[k]<min||s[k]>max))throw Error('Неверная настройка сцены');
  if(!Number.isFinite(s.light)||!Number.isFinite(s.focal))throw Error('Не заданы свет и камера');
  for(const k of ['shadow','grid'])if(!bool(s[k]))throw Error('Неверная настройка сцены');
  for(const k of ['floorEnabled','floorExport','floorGrid'])if(k in s&&!bool(s[k]))throw Error('Неверная настройка земли');
  d.objects.forEach((o,i)=>{if(o.id!==i||!bool(o.visible)||!vec(o.position,3,100)||!quat(o.quaternion))throw Error('Некорректное положение предмета');});
  if(!d.camera||!vec(d.camera.position,3)||!vec(d.camera.target,3)||!quat(d.camera.quaternion)||!Number.isFinite(d.camera.zoom)||d.camera.zoom<=0||d.camera.zoom>100)throw Error('Некорректная камера');
  if(d.version===2){
    const h=d.human,st=h?.state;if(!h||!bool(h.visible)||!bool(h.initialized)||!vec(h.position,3,100)||!quat(h.quaternion)||!st||!Number.isFinite(st.height)||st.height<100||st.height>210)throw Error('Некорректный манекен');
    for(const k of ['pelvis','pelvisRot','torso','head'])if(!vec(st[k],3,k==='pelvis'?100:3600))throw Error('Некорректная поза');
    for(const k of Object.keys(defaultHuman().targets)){if(!vec(st.targets?.[k],3,100)||!vec(st.rotations?.[k],3,3600)||!Number.isFinite(st.swivel?.[k])||Math.abs(st.swivel[k])>180)throw Error('Некорректное положение сустава');}
    if(!Array.isArray(d.links)||d.links.length!==4)throw Error('Некорректные привязки');
    for(const l of d.links)if(!l||!Object.hasOwn(LINK_NAMES,l.target)||!vec(l.position,3,100)||!quat(l.quaternion)||!bool(l.tipGround)||![null,'handle','shaft'].includes(l.anchor))throw Error('Некорректная привязка');
  }
  return true;
}
export function upgradeScene(d){validateScene(d);const result=structuredClone(d);result.settings={...DEFAULT_SETTINGS,...result.settings};if(result.version===1){result.version=2;result.human={visible:false,initialized:false,position:[0,0,0],quaternion:[0,0,0,1],state:defaultHuman()};result.links=emptyLinks();}return result;}
export function unpackFile(d){
  if(d?.format==='ski-form-library'&&d.version===1&&Array.isArray(d.presets)&&d.presets.length>0&&d.presets.length<=500)return {library:true,entries:d.presets.map(e=>({name:cleanName(e.name),scene:upgradeScene(e.scene)}))};
  if(d?.format==='ski-form-scene'&&d.version===1)return {library:false,entries:[{name:cleanName(d.name||d.scene?.label),scene:upgradeScene(d.scene)}]};
  return {library:false,entries:[{name:cleanName(d?.label),scene:upgradeScene(d)}]};
}
export function cleanName(name){return (typeof name==='string'?name:'Композиция').trim().slice(0,80)||'Композиция';}
export function estimatedBytes(value){return JSON.stringify(value).length*2;}
export async function encodeSharedScene(scene,name){
  const input=new TextEncoder().encode(JSON.stringify({format:'ski-form-scene',version:1,name:cleanName(name),scene}));let bytes=input,prefix='j';
  if(typeof CompressionStream!=='undefined'){bytes=new Uint8Array(await new Response(new Blob([input]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());prefix='z';}
  let binary='';for(const n of bytes)binary+=String.fromCharCode(n);return prefix+'.'+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export async function decodeSharedScene(encoded){
  if(typeof encoded!=='string'||encoded.length>100000||!/^([zj])\.[A-Za-z0-9_-]+$/.test(encoded))throw Error('Неверная ссылка на сцену');
  const [kind,payload]=encoded.split('.'),binary=atob(payload.replaceAll('-','+').replaceAll('_','/'));let bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  if(kind==='z'){
    if(typeof DecompressionStream==='undefined')throw Error('Этот браузер не поддерживает ссылки со сжатием. Откройте JSON файл.');
    const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader(),chunks=[];let size=0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>250000){await reader.cancel();throw Error('Слишком большая сцена в ссылке');}chunks.push(value);}}finally{reader.releaseLock();}
    bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  }
  if(bytes.length>250000)throw Error('Слишком большая сцена');const unpacked=unpackFile(JSON.parse(new TextDecoder().decode(bytes)));if(unpacked.library)throw Error('В ссылке должна быть одна сцена');return unpacked.entries[0];
}
