import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createNeonModel } from './assets/neon-models.js';

// Um único contexto WebGL compartilhado, desenho limitado a 24 fps e peças visíveis.
export function mountNeon3D(root) {
 let renderer;
 try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
 catch { root.dataset.webgl = 'unavailable'; return; }
 renderer.setPixelRatio(1); renderer.setClearColor(0,0);
 renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
 const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
 const environment = pmrem.fromScene(room).texture; room.dispose(); pmrem.dispose();
 const items = new Map(), reduce = matchMedia('(prefers-reduced-motion: reduce)');
 let raf = 0, last = 0, dirty = true;
 const motionOff = () => reduce.matches || document.documentElement.dataset.motion === 'reduce';
 function request() { dirty = true; if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
 const observer = new IntersectionObserver(entries => { for (const e of entries) {const item=items.get(e.target); if(item)item.visible=e.isIntersecting;} request(); });
 function discover() {
   for(const [el,item] of items) if(!el.isConnected){observer.unobserve(el);item.scene.traverse(o=>{o.geometry?.dispose();if(o.material) o.material.dispose();});items.delete(el);}
   root.querySelectorAll('[data-model]').forEach(el=>{
     if(items.has(el))return;
     const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.className='neon-canvas';
     const ctx=canvas.getContext('2d');if(!ctx)return;
     const model=createNeonModel(el.dataset.model), scene=new T.Scene();scene.environment=environment;scene.environmentIntensity=.65;scene.add(model);
     scene.add(new T.HemisphereLight(0xd5ecff,0x352456,1.2));
     const key=new T.DirectionalLight(0x8cf5ff,2);key.position.set(2,3,4);scene.add(key);
     const rim=new T.DirectionalLight(0xb389ff,3);rim.position.set(-3,0,-1);scene.add(rim);
     const camera=new T.PerspectiveCamera(36,1,.1,50);camera.position.z=el.dataset.model==='watch'?9:5.3;
     const item={canvas,ctx,model,scene,camera,visible:false,base:model.rotation.clone(),tilt:0};
     items.set(el,item);el.append(canvas);el.dataset.rendered='true';observer.observe(el);
     el.addEventListener('pointermove',e=>{item.tilt=(e.clientX-el.getBoundingClientRect().left)/Math.max(1,el.clientWidth)-.5;request();},{passive:true});
     el.addEventListener('pointerleave',()=>{item.tilt=0;request();});
   }); request();
 }
 function tick(time) {
   raf=0;if(document.hidden)return;
   const reduced=motionOff();
   if(time-last>1000/24 && (dirty||!reduced)){
     last=time;dirty=false;
     for(const [el,item] of items){
       if(!item.visible||!el.getClientRects().length)continue;
       const {canvas,ctx,model,scene,camera,base}=item;
       const ratio=Math.min(devicePixelRatio,1.5),w=Math.max(1,Math.round(el.clientWidth*ratio)),h=Math.max(1,Math.round(el.clientHeight*ratio));
       if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
       renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
       model.rotation.y=base.y+(reduced?0:Math.sin(time*.0005)*.3+item.tilt*.35);
       model.rotation.z=base.z+(reduced?0:Math.sin(time*.00035)*.05);
       model.position.y=reduced?0:Math.sin(time*.001)*.1;
       model.userData.orbits?.forEach((orbit,i)=>{orbit.rotation.z=reduced?i*.2:time*.00012*(i?1:-1);});
       renderer.render(scene,camera);ctx.clearRect(0,0,w,h);ctx.drawImage(renderer.domElement,0,0);
     }
   }
   if([...items.values()].some(i=>i.visible) && (!reduced||dirty))raf=requestAnimationFrame(tick);
 }
 new MutationObserver(discover).observe(root,{childList:true,subtree:true});
 new MutationObserver(request).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion','data-theme']});
 const resize=new ResizeObserver(request);resize.observe(root);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();});
 reduce.addEventListener('change',request);window.addEventListener('resize',request);
 discover();
}
