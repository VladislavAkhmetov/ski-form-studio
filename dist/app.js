import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { TransformControls } from './vendor/TransformControls.js';
import { defaults, createSki, createPole, replaceModel, setMaterial } from './model.js';

const $=id=>document.getElementById(id);
const svg=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const DEG=Math.PI/180, STORE='ski-form-scene-v1', LIBRARY='ski-form-library-v1';
const config={...defaults};
const settings={ratio:'3:4',resolution:2048,background:'white',shadow:true,grid:false,material:'clay',light:100,focal:70,projection:'perspective'};
const state={selected:[],mode:'translate',space:'world',snap:false,label:'Параллельная раскладка',restoring:false};
let renderer,scene,camera,orbit,gizmo,gizmoHelper,ground,grid,root,pivot,items=[],outlines=[],history=[],historyIndex=-1,saveTimer,toastTimer,animationFrame,exporting=false,storageAvailable=true,library=[],width=0,height=0;
const itemNames=['Лыжа 01','Лыжа 02','Палка 01','Палка 02'];
const PRESETS=[
 {id:'parallel',name:'Параллельно',label:'Параллельная раскладка',art:'M22 5v37M30 5v37M10 10v29M42 10v29',poses:[[-.055,0,0,0,0,0],[.055,0,0,0,0,0],[-.19,0,0,0,0,0],[.19,0,0,0,0,0]],view:'threequarter'},
 {id:'cross',name:'Накрест',label:'Перекрёстная композиция',art:'M14 7l25 34M39 7 14 41M9 15l34 22M43 15 9 37',poses:[[-.03,.025,0,0,-25,0],[.03,.075,0,0,25,0],[-.18,.13,0,0,35,0],[.18,.17,0,0,-35,0]],view:'top'},
 {id:'fan',name:'Веером',label:'Раскладка веером',art:'M13 7l12 35M32 5l-4 37M3 16l19 26M49 12 31 42',poses:[[-.13,.01,0,0,-12,0],[.13,.01,0,0,12,0],[-.38,.02,.03,0,-25,0],[.38,.02,.03,0,25,0]],view:'top'},
 {id:'stack',name:'В стопку',label:'Собранный комплект',art:'M23 5v37M26 6v36M30 10v30M33 10v30',poses:[[-.018,.0,0,0,0,0],[.018,.06,.035,0,0,180],[.09,.015,.03,0,0,0],[.115,.025,.03,0,0,0]],view:'threequarter'},
 {id:'float',name:'В воздухе',label:'Свободная композиция',art:'M14 5l8 33M33 9l6 33M7 15l7 24M43 5l4 25',poses:[[-.15,.16,.04,8,-12,9],[.14,.24,-.06,-12,15,-18],[-.38,.26,.12,8,-20,-12],[.38,.35,-.1,-9,19,15]],view:'threequarter'},
 {id:'base',name:'Две стороны',label:'Лицевая и скользящая стороны',art:'M19 5v37M34 5v37M16 18h6M31 10v25',poses:[[-.085,.035,0,0,0,0],[.085,.065,0,0,0,180],[-.24,0,0,0,0,0],[.24,0,0,0,0,0]],view:'top'}
];

function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function safeRead(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function safeWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageAvailable=false;$('saveStatus').textContent='Автосохранение недоступно';return false;}}
function active(container,key,value){$(container).querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset[key]===String(value)));}
function round(n,d=1){return Math.abs(n)<.00005?'0':String(Number(n.toFixed(d)));}
function worldTransform(object){object.updateWorldMatrix(true,false);const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();object.matrixWorld.decompose(p,q,s);return {position:p.toArray(),quaternion:q.toArray()};}
function sceneData(){return {version:1,label:state.label,config:{...config},settings:{...settings},objects:items.map(o=>({id:o.userData.id,...worldTransform(o),visible:o.visible})),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:orbit.target.toArray(),zoom:camera.zoom}};}
function queueSave(){if(state.restoring||exporting)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(safeWrite(STORE,sceneData())&&storageAvailable){$('saveStatus').innerHTML='<i></i> Сохранено на устройстве';}},500);}
function record(){if(state.restoring)return;const data=sceneData(),str=JSON.stringify(data);if(historyIndex>=0&&JSON.stringify(history[historyIndex])===str){queueSave();return;}history.splice(historyIndex+1);history.push(data);if(history.length>60)history.shift();historyIndex=history.length-1;updateHistory();queueSave();}
function updateHistory(){$('undoBtn').disabled=historyIndex<=0;$('redoBtn').disabled=historyIndex>=history.length-1;}
function undo(){if(historyIndex<=0)return;restore(history[--historyIndex]);updateHistory();queueSave();}
function redo(){if(historyIndex>=history.length-1)return;restore(history[++historyIndex]);updateHistory();queueSave();}

function init(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#fff');
  renderer=new THREE.WebGLRenderer({canvas:$('viewport'),antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  camera=new THREE.PerspectiveCamera(28,1,.005,100);camera.position.set(1.2,2.7,-2.1);camera.setFocalLength(70);
  orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.12;orbit.minDistance=.2;orbit.maxDistance=20;orbit.minPolarAngle=.002;orbit.maxPolarAngle=Math.PI-.002;
  orbit.addEventListener('end',queueSave);orbit.addEventListener('start',()=>{$('cameraViews').querySelectorAll('button').forEach(b=>b.classList.remove('active'));});
  scene.add(new THREE.HemisphereLight('#ffffff','#bfc4b6',.8));
  const key=new THREE.DirectionalLight('#fff7ec',2);key.position.set(-1.5,3.5,-1.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-2.5;key.shadow.camera.right=2.5;key.shadow.camera.top=2.5;key.shadow.camera.bottom=-2.5;key.shadow.camera.near=.05;key.shadow.camera.far=10;key.shadow.normalBias=.003;key.shadow.bias=-.00012;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight('#eef4ff',.65);fill.position.set(2,1.5,1);scene.add(fill);
  ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.17,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  grid=new THREE.GridHelper(6,60,'#c2c9b5','#e0e5d7');grid.material.transparent=true;grid.material.opacity=.4;grid.visible=false;scene.add(grid);
  root=new THREE.Group();scene.add(root);pivot=new THREE.Group();root.add(pivot);
  for(let i=0;i<4;i++){const o=i<2?createSki(config):createPole(config,i===2?-1:1);o.userData={...o.userData,id:i,side:i===2?-1:1};root.add(o);items.push(o);}
  gizmo=new TransformControls(camera,renderer.domElement);gizmo.setSize(.72);gizmoHelper=gizmo.getHelper();scene.add(gizmoHelper);
  gizmo.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;});
  gizmo.addEventListener('objectChange',()=>{updateInspector();updateGround();updateOutlines();});
  gizmo.addEventListener('mouseUp',()=>{state.label='Своя композиция';$('compositionLabel').textContent=state.label;clearPresetActive();record();});
  renderUI();bindUI();applyPreset('parallel',false);select([0]);
  const saved=safeRead(STORE);if(saved){try{validate(saved);restore(saved);}catch{toast('Сохранённая сцена несовместима. Открыта новая.');}}
  library=safeRead(LIBRARY);if(!Array.isArray(library))library=[];renderLibrary();record();
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('stage'));resize();
  $('loading').hidden=true;
  function animate(){animationFrame=requestAnimationFrame(animate);orbit.update();updateOutlines();renderer.render(scene,camera);}animate();
  window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);safeWrite(STORE,sceneData());});
}

function releaseSelection(){gizmo.detach();for(const o of items)if(o.parent===pivot)root.attach(o);pivot.position.set(0,0,0);pivot.rotation.set(0,0,0);pivot.scale.set(1,1,1);for(const line of outlines){scene.remove(line);line.geometry.dispose();line.material.dispose();}outlines=[];}
function select(ids){
  releaseSelection();state.selected=[...new Set(ids)].filter(i=>items[i]&&items[i].visible);
  if(state.selected.length===1)gizmo.attach(items[state.selected[0]]);
  if(state.selected.length>1){const center=new THREE.Vector3();for(const id of state.selected)center.add(items[id].position);pivot.position.copy(center.multiplyScalar(1/state.selected.length));pivot.updateMatrixWorld();for(const id of state.selected)pivot.attach(items[id]);gizmo.attach(pivot);}
  for(const id of state.selected){const line=new THREE.BoxHelper(items[id],0x99a97e);line.material.transparent=true;line.material.opacity=.46;line.material.depthTest=false;line.renderOrder=2;scene.add(line);outlines.push(line);}
  updateObjectList();updateInspector();
}
function updateOutlines(){for(const l of outlines)l.update();}
function updateGround(){root.updateMatrixWorld(true);const box=new THREE.Box3();for(const o of items)if(o.visible)box.union(new THREE.Box3().setFromObject(o));const y=box.isEmpty()?-.005:box.min.y-.003;ground.position.y=y;grid.position.y=y+.0002;ground.visible=settings.shadow;}
function selectedObject(){return state.selected.length>1?pivot:state.selected.length===1?items[state.selected[0]]:null;}
function updateInspector(){
  const count=state.selected.length,target=selectedObject();$('selectedName').textContent=count===0?'Нет выделения':count===1?itemNames[state.selected[0]]:`Группа предметов`;$('selectedCount').textContent=String(count).padStart(2,'0');$('transformFields').hidden=!count;$('emptySelection').hidden=!!count;
  $('selectionStatus').textContent=count?count===1?`${itemNames[state.selected[0]]} выбрана`:`Выбрано предметов: ${count}`:'Выберите предмет';
  if(!target)return;
  for(const [i,axis]of ['x','y','z'].entries()){
    if(document.activeElement!==$(`pos-${axis}`))$(`pos-${axis}`).value=round(target.position[axis]*100,1);
    if(document.activeElement!==$(`rot-${axis}`))$(`rot-${axis}`).value=round(THREE.MathUtils.radToDeg(target.rotation[axis]),1);
  }
}
function updateObjectList(){
  document.querySelectorAll('.object-row').forEach((row,i)=>{row.classList.toggle('selected',state.selected.includes(i));row.classList.toggle('is-hidden',!items[i].visible);row.querySelector('.object-select').setAttribute('aria-pressed',state.selected.includes(i));row.querySelector('.visibility-button').innerHTML=svg(items[i].visible?'eye':'hidden');row.querySelector('.visibility-button').title=`${items[i].visible?'Скрыть':'Показать'} ${itemNames[i].toLowerCase()}`;row.querySelector('.visibility-button').setAttribute('aria-label',row.querySelector('.visibility-button').title);});
}
function renderUI(){
  $('objectList').innerHTML=items.map((o,i)=>`<div class="object-row" data-id="${i}"><button class="object-select" data-select="${i}" aria-pressed="false"><span class="object-glyph">${i<2?'<svg viewBox="0 0 26 40"><path d="M11 37V8q0-6 2-6t2 6v29zM11 19h4m-3 3h2v5h-2zM12 30h2v3h-2"/></svg>':'<svg viewBox="0 0 26 40"><path d="M13 37V4m-2 1v6h4V5m-2 28-5 3h10l-5-3M11 7 6 14l5-3"/></svg>'}</span><span class="object-info"><strong>${itemNames[i]}</strong><small>${i<2?'SKI / NORDIC':'POLE / NORDIC'}</small></span></button><button class="icon-button visibility-button" data-visibility="${i}"></button></div>`).join('');
  $('presets').innerHTML=PRESETS.map((p,i)=>`<button class="preset-card" data-preset="${p.id}" title="${p.label}"><span class="preset-art"><span class="preset-index">0${i+1}</span><svg viewBox="0 0 52 48"><path d="${p.art}"/></svg></span><span>${p.name}</span></button>`).join('');
  for(const [container,prefix]of [['positionFields','pos'],['rotationFields','rot']])$(container).innerHTML=['x','y','z'].map(axis=>`<label class="axis-field ${axis}"><span>${axis.toUpperCase()}</span><input id="${prefix}-${axis}" type="number" step="${prefix==='pos'?1:5}" min="${prefix==='pos'?-1000:-3600}" max="${prefix==='pos'?1000:3600}" aria-label="${prefix==='pos'?'Положение':'Вращение'} ${axis.toUpperCase()}"></label>`).join('');
}
function clearPresetActive(){$('presets').querySelectorAll('.active').forEach(b=>b.classList.remove('active'));}
function applyPreset(id,save=true){
  const preset=PRESETS.find(p=>p.id===id);if(!preset)return;const selected=[...state.selected];releaseSelection();
  preset.poses.forEach((p,i)=>{items[i].position.set(...p.slice(0,3));items[i].rotation.set(...p.slice(3).map(v=>v*DEG));items[i].visible=true;});
  state.label=preset.label;$('compositionLabel').textContent=state.label;clearPresetActive();document.querySelector(`[data-preset="${id}"]`)?.classList.add('active');
  updateGround();setView(preset.view,false);select(selected);if(save)record();
}

function visibleBounds(){root.updateMatrixWorld(true);const box=new THREE.Box3();for(const o of items)if(o.visible)box.union(new THREE.Box3().setFromObject(o));if(box.isEmpty())box.setFromCenterAndSize(new THREE.Vector3(),new THREE.Vector3(.4,.1,1.8));return box;}
function fit(recordIt=true){
  orbit.update();const box=visibleBounds(),center=box.getCenter(new THREE.Vector3()),direction=camera.position.clone().sub(orbit.target).normalize();if(!direction.lengthSq())direction.set(0,1,-.001).normalize();
  camera.position.copy(center).add(direction);camera.lookAt(center);camera.updateMatrixWorld();
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);let ex=0,ey=0,ez=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).sub(center);ex=Math.max(ex,Math.abs(p.dot(right)));ey=Math.max(ey,Math.abs(p.dot(up)));ez=Math.max(ez,Math.abs(p.dot(direction)));}
  orbit.target.copy(center);
  if(camera.isPerspectiveCamera){const tan=Math.tan(camera.fov*DEG/2),distance=Math.max(ey/tan,ex/(tan*camera.aspect))*1.22+ez;camera.position.copy(center).addScaledVector(direction,Math.max(.35,distance));camera.zoom=1;}
  else{camera.position.copy(center).addScaledVector(direction,4);camera.zoom=2/Math.max(2*ey,2*ex/camera.aspect,.05)/1.22;}
  camera.lookAt(center);camera.updateProjectionMatrix();orbit.update();if(recordIt)record();
}
function setView(name,recordIt=true){
  const dirs={top:[0,1,-.0001],threequarter:[.45,3.1,-1.3],side:[1,.035,0],front:[0,.08,-1],bottom:[0,-1,-.0001]};if(!dirs[name])return;
  orbit.update();const center=visibleBounds().getCenter(new THREE.Vector3());orbit.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(...dirs[name]).normalize().multiplyScalar(4));camera.up.set(0,1,0);camera.lookAt(center);fit(false);active('cameraViews','view',name);if(recordIt)record();
}
function projection(name,save=true){
  orbit.update();const pos=camera.position.clone(),quat=camera.quaternion.clone(),target=orbit.target.clone(),distance=pos.distanceTo(target),aspect=camera.aspect;
  const previous=camera;
  if(name==='orthographic'){camera=new THREE.OrthographicCamera(-aspect,aspect,1,-1,.005,100);camera.zoom=1/(distance*Math.tan(previous.fov*DEG/2));}
  else{camera=new THREE.PerspectiveCamera(28,aspect,.005,100);camera.setFocalLength(settings.focal);const d=1/(previous.zoom*Math.tan(camera.fov*DEG/2));pos.copy(target).add(previous.position.clone().sub(target).normalize().multiplyScalar(d));}
  camera.position.copy(pos);camera.quaternion.copy(quat);camera.updateProjectionMatrix();orbit.object=camera;orbit.target.copy(target);orbit.update();gizmo.camera=camera;settings.projection=name;$('projectionBtn').innerHTML=`${name==='perspective'?'Перспектива':'Ортография'} ${svg('chevron')}`;$('focalInput').disabled=name==='orthographic';if(save)record();
}
function resize(){
  if(exporting)return;const rect=$('stage').getBoundingClientRect(),style=getComputedStyle($('stage')),availW=Math.max(80,rect.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),availH=Math.max(120,rect.height-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));
  const [rw,rh]=settings.ratio.split(':').map(Number),ratio=rw/rh;let h=availH,w=h*ratio;if(w>availW){w=availW;h=w/ratio;}width=Math.round(w);height=Math.round(h);$('artboard').style.width=width+'px';$('artboard').style.height=height+'px';renderer.setSize(width,height,false);const aspect=width/height;camera.aspect=aspect;if(camera.isOrthographicCamera){camera.left=-aspect;camera.right=aspect;camera.top=1;camera.bottom=-1;}camera.updateProjectionMatrix();
}
function exportDimensions(){const [w,h]=settings.ratio.split(':').map(Number),max=settings.resolution;return w>=h?[max,Math.round(max*h/w)]:[Math.round(max*w/h),max];}
function updateExportLabels(){const [w,h]=exportDimensions();$('canvasFormat').textContent=settings.ratio;$('renderSize').textContent=`${w} × ${h} px`;}
function applySettings(){
  setMaterial(settings.material);renderer.toneMappingExposure=.95*settings.light/100;scene.background=settings.background==='transparent'?null:new THREE.Color(settings.background==='gray'?'#eeeeeb':'#ffffff');$('artboard').classList.toggle('transparent',settings.background==='transparent');grid.visible=settings.grid;ground.visible=settings.shadow;
  for(const [key,value]of Object.entries(config)){const el=$(key+'Input')||$(key);if(el){if(el.type==='checkbox')el.checked=value;else el.value=value;}if($(key+'Value'))$(key+'Value').textContent=`${value} см`;}
  $('shadowInput').checked=settings.shadow;$('lightInput').value=settings.light;$('lightValue').textContent=`${settings.light}%`;$('focalInput').value=settings.focal;$('focalValue').textContent=`${settings.focal} мм`;$('resolutionInput').value=settings.resolution;$('gridBtn').classList.toggle('active',settings.grid);
  active('ratioOptions','ratio',settings.ratio);active('backgroundOptions','bg',settings.background);active('materialOptions','material',settings.material);updateExportLabels();
}
function rebuild(){for(const o of items)replaceModel(o,config);setMaterial(settings.material);updateGround();updateOutlines();}
function dirty(){state.label='Своя композиция';$('compositionLabel').textContent=state.label;clearPresetActive();record();}

function bindUI(){
  $('objectList').addEventListener('click',e=>{const v=e.target.closest('[data-visibility]');if(v){const id=+v.dataset.visibility;items[id].visible=!items[id].visible;select(state.selected.filter(i=>items[i].visible));updateGround();record();return;}const b=e.target.closest('[data-select]');if(b){const id=+b.dataset.select;if(!items[id].visible){items[id].visible=true;updateGround();}select(e.shiftKey?state.selected.includes(id)?state.selected.filter(i=>i!==id):[...state.selected,id]:[id]);}});
  $('selectAll').onclick=()=>select(items.filter(o=>o.visible).map(o=>o.userData.id));
  $('presets').onclick=e=>{const b=e.target.closest('[data-preset]');if(b)applyPreset(b.dataset.preset);};
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,axis:gizmo.axis,button:e.button};});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||down.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5||down.axis||gizmo.dragging)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);let hit=null;for(const h of raycaster.intersectObjects(items.filter(o=>o.visible),true)){let p=h.object;while(p&&!items.includes(p))p=p.parent;if(p){hit=p;break;}}if(hit){const id=hit.userData.id;select(e.shiftKey?state.selected.includes(id)?state.selected.filter(i=>i!==id):[...state.selected,id]:[id]);setTab('object');}else if(!e.shiftKey)select([]);down=null;});
  $('moveBtn').onclick=()=>setMode('translate');$('rotateBtn').onclick=()=>setMode('rotate');
  $('spaceBtn').onclick=()=>{state.space=state.space==='world'?'local':'world';gizmo.setSpace(state.space);$('spaceBtn').textContent=state.space==='world'?'Мировые оси':'Локальные оси';};
  for(const axis of ['x','y','z'])for(const kind of ['pos','rot']){
    const field=$(`${kind}-${axis}`);
    field.addEventListener('input',e=>{const o=selectedObject();if(!o||e.target.value==='')return;const n=+e.target.value;if(!Number.isFinite(n))return;const value=Math.max(kind==='pos'?-1000:-3600,Math.min(kind==='pos'?1000:3600,n));if(kind==='pos')o.position[axis]=value/100;else o.rotation[axis]=value*DEG;o.updateMatrixWorld(true);updateGround();updateInspector();state.label='Своя композиция';$('compositionLabel').textContent=state.label;clearPresetActive();queueSave();});
    field.addEventListener('change',()=>{updateInspector();record();});
  }
  document.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>{const o=selectedObject();if(!o){toast('Сначала выберите предмет');return;}o.rotateOnWorldAxis(new THREE.Vector3(0,1,0),+b.dataset.turn*DEG);updateGround();updateInspector();dirty();});
  $('flipBtn').onclick=()=>{const o=selectedObject();if(!o)return;o.rotateZ(Math.PI);updateGround();updateInspector();dirty();};
  $('snapInput').onchange=e=>{state.snap=e.target.checked;gizmo.setTranslationSnap(state.snap?.01:null);gizmo.setRotationSnap(state.snap?15*DEG:null);};
  $('resetObject').onclick=()=>{const ids=[...state.selected];releaseSelection();ids.forEach(id=>{const p=PRESETS[0].poses[id];items[id].position.set(...p.slice(0,3));items[id].rotation.set(0,0,0);});select(ids);updateGround();dirty();};
  for(const key of ['skiLength','skiWidth','tipRise','poleLength']){$(key).oninput=e=>{config[key]=+e.target.value;$(key+'Value').textContent=`${config[key]} см`;rebuild();};$(key).onchange=()=>record();}
  for(const key of ['bindings','straps'])$(key+'Input').onchange=e=>{config[key]=e.target.checked;rebuild();record();};
  $('objectTab').onclick=()=>setTab('object');$('sceneTab').onclick=()=>setTab('scene');
  $('materialOptions').onclick=e=>{const b=e.target.closest('[data-material]');if(!b)return;settings.material=b.dataset.material;setMaterial(settings.material);active('materialOptions','material',settings.material);record();};
  $('lightInput').oninput=e=>{settings.light=+e.target.value;renderer.toneMappingExposure=.95*settings.light/100;$('lightValue').textContent=settings.light+'%';};$('lightInput').onchange=record;
  $('focalInput').oninput=e=>{settings.focal=+e.target.value;$('focalValue').textContent=settings.focal+' мм';if(camera.isPerspectiveCamera){const oldFov=camera.fov;camera.setFocalLength(settings.focal);const target=orbit.target.clone(),dir=camera.position.clone().sub(target),newDist=dir.length()*Math.tan(oldFov*DEG/2)/Math.tan(camera.fov*DEG/2);camera.position.copy(target).add(dir.normalize().multiplyScalar(newDist));camera.updateProjectionMatrix();}};$('focalInput').onchange=record;
  $('shadowInput').onchange=e=>{settings.shadow=e.target.checked;ground.visible=settings.shadow;record();};
  $('cameraViews').onclick=e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view);};
  $('projectionBtn').onclick=()=>projection(settings.projection==='perspective'?'orthographic':'perspective');
  $('fitBtn').onclick=()=>fit();$('gridBtn').onclick=()=>{settings.grid=!settings.grid;grid.visible=settings.grid;$('gridBtn').classList.toggle('active',settings.grid);record();};
  $('ratioOptions').onclick=e=>{const b=e.target.closest('[data-ratio]');if(!b)return;settings.ratio=b.dataset.ratio;active('ratioOptions','ratio',settings.ratio);resize();fit(false);updateExportLabels();record();};
  $('resolutionInput').onchange=e=>{settings.resolution=+e.target.value;updateExportLabels();record();};
  $('backgroundOptions').onclick=e=>{const b=e.target.closest('[data-bg]');if(!b)return;settings.background=b.dataset.bg;applySettings();record();};
  $('undoBtn').onclick=undo;$('redoBtn').onclick=redo;$('exportTop').onclick=exportPNG;$('exportBtn').onclick=exportPNG;$('saveBtn').onclick=saveFile;
  $('addPreset').onclick=saveToLibrary;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=importFile;
  $('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=$('helpDone').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=$('helpDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('helpDialog').close();}});
  document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('helpDialog').open)return;const ctrl=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(ctrl&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(ctrl&&key==='a'){e.preventDefault();$('selectAll').click();return;}if(ctrl&&key==='s'){e.preventDefault();saveFile();return;}if(key==='g')setMode('translate');if(key==='r')setMode('rotate');if(key==='f'){e.preventDefault();fit();}if(key==='escape')select([]);});
}
function setMode(mode){state.mode=mode;gizmo.setMode(mode);$('moveBtn').classList.toggle('active',mode==='translate');$('rotateBtn').classList.toggle('active',mode==='rotate');}
function setTab(tab){const object=tab==='object';$('objectInspector').hidden=!object;$('sceneInspector').hidden=object;$('objectTab').classList.toggle('active',object);$('sceneTab').classList.toggle('active',!object);$('objectTab').setAttribute('aria-selected',object);$('sceneTab').setAttribute('aria-selected',!object);}

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportPNG(){
  if(exporting)return;exporting=true;document.body.classList.add('exporting');$('exportBtn').disabled=true;$('exportTop').disabled=true;
  const [w,h]=exportDimensions(),oldRatio=renderer.getPixelRatio(),gridVisible=grid.visible,helperVisible=gizmoHelper.visible,outlineVis=outlines.map(o=>o.visible),oldAspect=camera.aspect;
  try {
    toast(`Готовим PNG ${w} × ${h}…`);await new Promise(r=>requestAnimationFrame(r));orbit.update();
    grid.visible=false;gizmoHelper.visible=false;outlines.forEach(o=>o.visible=false);renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;if(camera.isOrthographicCamera){camera.left=-w/h;camera.right=w/h;}camera.updateProjectionMatrix();renderer.render(scene,camera);
    const blob=await new Promise((resolve,reject)=>renderer.domElement.toBlob(b=>b?resolve(b):reject(Error('Не удалось создать PNG')),'image/png'));
    const dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
    const name=`ski-form-${w}x${h}-${Date.now()}.png`;$('exportPreview').src=dataURL;$('exportAgain').href=dataURL;$('exportAgain').download=name;$('exportResultSize').textContent=`${w} × ${h} · PNG`;$('exportResult').hidden=false;
    download(blob,name);toast('PNG готов. Ссылка на скачивание — в панели экспорта.');
  }catch(error){console.error(error);toast('Не удалось выгрузить кадр. Попробуйте меньшее разрешение.');}
  finally{renderer.setPixelRatio(oldRatio);grid.visible=gridVisible;gizmoHelper.visible=helperVisible;outlines.forEach((o,i)=>o.visible=outlineVis[i]);camera.aspect=oldAspect;exporting=false;resize();renderer.render(scene,camera);document.body.classList.remove('exporting');$('exportBtn').disabled=false;$('exportTop').disabled=false;}
}
function saveFile(){const data=sceneData();download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),`ski-form-scene-${Date.now()}.json`);safeWrite(STORE,data);toast('Сцена сохранена в JSON файл');}
function saveToLibrary(){if(library.length>=24){toast('Сохранено 24 композиции. Удалите ненужную, чтобы добавить новую.');return;}const name=`Композиция ${String(library.length+1).padStart(2,'0')}`;library.push({name,scene:sceneData(),id:Date.now()});if(safeWrite(LIBRARY,library)){renderLibrary();toast('Композиция сохранена в этом браузере');}}
function renderLibrary(){const host=$('savedPresets');host.replaceChildren();if(!library.length){host.innerHTML='<div class="saved-empty">Сохраните удачный ракурс кнопкой +<br>и возвращайтесь к нему в один клик.</div>';return;}for(const entry of library){const row=document.createElement('div');row.className='saved-row';const b=document.createElement('button');b.textContent=entry.name;b.onclick=()=>{try{validate(entry.scene);restore(entry.scene);record();toast('Композиция открыта');}catch{toast('Не удалось открыть композицию');}};const del=document.createElement('button');del.className='icon-button';del.textContent='×';del.title='Удалить композицию';del.setAttribute('aria-label',`Удалить ${entry.name}`);del.onclick=()=>{library=library.filter(p=>p.id!==entry.id);safeWrite(LIBRARY,library);renderLibrary();};row.append(b,del);host.append(row);}}
function vectorOK(v,len,max=100){return Array.isArray(v)&&v.length===len&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=max);}
function validate(d){
  if(!d||d.version!==1||!d.config||!d.settings||!Array.isArray(d.objects)||d.objects.length!==4)throw Error('Неверный формат сцены');
  for(const [k,min,max]of [['skiLength',120,210],['skiWidth',3.8,8],['tipRise',2,12],['poleLength',90,180]])if(!Number.isFinite(d.config[k])||d.config[k]<min||d.config[k]>max)throw Error('Недопустимые размеры');
  for(const k of ['bindings','straps'])if(typeof d.config[k]!=='boolean')throw Error('Неверная настройка геометрии');
  if(!['1:1','3:4','4:3','9:16'].includes(d.settings.ratio)||![1024,2048,4096].includes(d.settings.resolution)||!['white','gray','transparent'].includes(d.settings.background)||!['clay','white','graphite'].includes(d.settings.material)||!['perspective','orthographic'].includes(d.settings.projection))throw Error('Неверные настройки сцены');
  if(!Number.isFinite(d.settings.light)||d.settings.light<50||d.settings.light>150||!Number.isFinite(d.settings.focal)||d.settings.focal<28||d.settings.focal>120)throw Error('Неверные настройки света или камеры');
  for(const k of ['shadow','grid'])if(typeof d.settings[k]!=='boolean')throw Error('Неверная настройка сцены');
  d.objects.forEach((o,i)=>{if(o.id!==i||typeof o.visible!=='boolean'||!vectorOK(o.position,3,10)||!vectorOK(o.quaternion,4,1.01)||Math.abs(o.quaternion.reduce((s,n)=>s+n*n,0)-1)>.02)throw Error('Некорректное положение предмета');});
  if(!d.camera||!vectorOK(d.camera.position,3)||!vectorOK(d.camera.target,3)||!vectorOK(d.camera.quaternion,4,1.01)||!Number.isFinite(d.camera.zoom)||d.camera.zoom<=0||d.camera.zoom>100)throw Error('Неверная камера');
}
function restore(data){
  const selected=[...state.selected];state.restoring=true;try{releaseSelection();for(const k of Object.keys(defaults))config[k]=data.config[k];for(const k of Object.keys(settings))if(k in data.settings)settings[k]=data.settings[k];rebuild();
    data.objects.forEach((o,i)=>{items[i].position.fromArray(o.position);items[i].quaternion.fromArray(o.quaternion).normalize();items[i].visible=o.visible;});
    const wanted=settings.projection;if(wanted==='orthographic'&&!camera.isOrthographicCamera)projection('orthographic',false);if(wanted==='perspective'&&!camera.isPerspectiveCamera)projection('perspective',false);
    camera.position.fromArray(data.camera.position);camera.quaternion.fromArray(data.camera.quaternion).normalize();camera.zoom=data.camera.zoom;orbit.target.fromArray(data.camera.target);if(camera.isPerspectiveCamera)camera.setFocalLength(settings.focal);camera.updateProjectionMatrix();orbit.update();
    state.label=typeof data.label==='string'?data.label.slice(0,80):'Своя композиция';$('compositionLabel').textContent=state.label;applySettings();resize();updateGround();select(selected);clearPresetActive();$('projectionBtn').innerHTML=`${wanted==='perspective'?'Перспектива':'Ортография'} ${svg('chevron')}`;$('focalInput').disabled=wanted==='orthographic';
  }finally{state.restoring=false;}
}
async function importFile(e){const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>1000000){toast('Слишком большой файл сцены');return;}try{const data=JSON.parse(await file.text());validate(data);restore(data);record();toast('Сцена открыта');}catch(error){toast('Не удалось открыть файл: нужен JSON сцены Ski Form.');console.warn(error);}}

try{init();}catch(error){console.error(error);$('loading').innerHTML='<strong>Не удалось запустить 3D студию</strong><span>Откройте страницу в браузере с поддержкой WebGL.</span><button class="button secondary" onclick="location.reload()">Повторить</button>';}
