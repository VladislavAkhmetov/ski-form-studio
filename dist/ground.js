import * as THREE from 'three';

export class GroundGuide extends THREE.Group {
  constructor(){
    super();this.name='Земля · опорная плоскость';this.layout='';
    const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
    this.surface=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#e9ecf0',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1,toneMapped:false}));
    this.add(this.surface);
    this.lines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#b9c1cc',transparent:true,opacity:.7,toneMapped:false}));
    this.lines.position.y=.0007;this.add(this.lines);
    this.border=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#8792a2',toneMapped:false}));
    this.border.position.y=.001;this.add(this.border);
  }
  update(settings){
    this.visible=settings.floorEnabled;this.position.y=settings.floorY/100;
    const w=settings.floorWidth/100,l=settings.floorLength/100,key=`${w}:${l}`;
    this.surface.scale.set(w,1,l);this.lines.visible=settings.floorGrid;
    if(this.layout===key)return;this.layout=key;
    const vertices=[],step=.2;
    for(let x=Math.ceil(-w/2/step)*step;x<w/2-.001;x+=step)if(x>-w/2+.001)vertices.push(x,0,-l/2,x,0,l/2);
    for(let z=Math.ceil(-l/2/step)*step;z<l/2-.001;z+=step)if(z>-l/2+.001)vertices.push(-w/2,0,z,w/2,0,z);
    this.lines.geometry.dispose();this.lines.geometry=new THREE.BufferGeometry();this.lines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    this.border.geometry.dispose();this.border.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w/2,0,-l/2),new THREE.Vector3(w/2,0,-l/2),new THREE.Vector3(w/2,0,l/2),new THREE.Vector3(-w/2,0,l/2)]);
  }
}
