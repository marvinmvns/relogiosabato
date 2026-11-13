// Peças 3D autorais, construídas em malhas. Sem downloads nem texturas remotas.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const cyan = 0x59f3ff, purple = 0x9673ff;
const material = (color, glow = 0) => new T.MeshStandardMaterial({ color, metalness: .65, roughness: .24, emissive: color, emissiveIntensity: glow });
function box(w, h, d, r, mat) { return new T.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); }
function torus(r, tube, mat) { return new T.Mesh(new T.TorusGeometry(r, tube, 12, 64), mat); }
function tube(points, mat, radius = .055) { return new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 64, radius, 8, false), mat); }
function extrude(points, mat, depth = .42) {
 const shape = new T.Shape(); points(shape);
 const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .09, bevelThickness: .09, curveSegments: 32 });
 geo.center(); return new T.Mesh(geo, mat);
}
export function createNeonModel(kind) {
 const group = new T.Group();
 const ice = material(cyan, .25), violet = material(purple, .15), metal = material(0x29354b), dark = material(0x090f1d);
 if (kind === 'watch') {
   const strap = box(1.2, 4.15, .21, .2, dark); strap.position.z = -.15; group.add(strap);
   for (let y = -1.7; y <= 1.8; y += .23) { if (Math.abs(y) < 1.05) continue; const seam = box(.94, .045, .04, .015, metal); seam.position.set(0, y, -.01); group.add(seam); }
   group.add(box(1.94, 2.3, .42, .35, metal));
   const rim = box(1.8, 2.16, .12, .3, ice); rim.position.z = .23; group.add(rim);
   const glass = box(1.68, 2.04, .13, .28, dark); glass.position.z = .3; group.add(glass);
   const ring = torus(.51, .055, ice); ring.position.set(0, .15, .4); group.add(ring);
   const ring2 = torus(.37, .035, violet); ring2.position.set(0, .15, .41); group.add(ring2);
   group.add(tube([[-.68,.1,.45],[-.33,.1,.45],[-.16,.36,.45],[.04,-.15,.45],[.22,.2,.45],[.39,.1,.45],[.68,.1,.45]], ice, .025));
   for(let i = 0; i < 3; i++){const bar = box(.18,.055,.025,.02,i===0?ice:violet);bar.position.set((i-1)*.3,-.65,.4);group.add(bar);}
   const crown = new T.Mesh(new T.CylinderGeometry(.14,.14,.22,24), violet); crown.rotation.z=Math.PI/2; crown.position.set(1.04,.23,0);group.add(crown);
   group.rotation.set(-.18,-.44,-.18);
   const orbit = torus(2.5,.018,violet);orbit.rotation.set(1.15,.2,.2);group.add(orbit);
   const orbit2 = torus(2.7,.012,ice);orbit2.rotation.set(.85,-.4,-.25);group.add(orbit2);group.userData.orbits=[orbit,orbit2];
   return group;
 }
 if (kind === 'hr') {
   group.add(extrude(s=>{s.moveTo(0,-.85);s.bezierCurveTo(-.2,-.6,-1.2,.05,-1.05,.65);s.bezierCurveTo(-.9,1.25,-.2,1.25,0,.7);s.bezierCurveTo(.2,1.25,.9,1.25,1.05,.65);s.bezierCurveTo(1.2,.05,.2,-.6,0,-.85);},material(0xff316d,.06)));
   group.add(tube([[-.7,.1,.34],[-.35,.1,.34],[-.18,.4,.34],[.05,-.22,.34],[.25,.18,.34],[.65,.18,.34]], ice, .025));
 } else if (kind === 'energy') {
   group.add(extrude(s=>{s.moveTo(.25,1.2);s.lineTo(-.85,-.1);s.lineTo(-.15,-.1);s.lineTo(-.3,-1.2);s.lineTo(.9,.25);s.lineTo(.2,.25);s.closePath();},material(0xc9ff5e,.18)));
 } else if (kind === 'spo2') {
   for (const [x,y,r] of [[-.55,-.3,.45],[.5,.4,.65]]) { const sphere = new T.Mesh(new T.SphereGeometry(r,32,24),ice);sphere.position.set(x,y,0);group.add(sphere); }
   group.add(tube([[-.55,-.3,0],[.5,.4,0]],violet,.12));
 } else if (kind === 'temp') {
   group.add(box(.45,1.65,.3,.2,ice));const bulb=new T.Mesh(new T.SphereGeometry(.44,32,24),material(0xffaf61,.2));bulb.position.y=-.8;group.add(bulb);
   const fill=box(.12,1.1,.1,.05,material(0xffaf61,.3));fill.position.z=.2;group.add(fill);
 } else if (kind === 'hrv') {
   group.add(tube([[-1.1,0,0],[-.7,0,0],[-.45,.7,0],[-.1,-.7,0],[.25,.6,0],[.5,0,0],[1.1,0,0]],ice,.1));
 } else if (kind === 'bp') {
   const gauge=torus(.82,.17,material(0xff947e,.1));group.add(gauge);
   group.add(tube([[0,0,.15],[.45,.48,.15]],ice,.075));group.add(new T.Mesh(new T.SphereGeometry(.15,24,16),ice));
 } else if (kind === 'distance') {
   const pin=extrude(s=>{s.moveTo(0,-1.1);s.bezierCurveTo(-1.6,.7,-.8,1.4,0,1.4);s.bezierCurveTo(.8,1.4,1.6,.7,0,-1.1);},ice,.15);group.add(pin);
   const hole=new T.Mesh(new T.SphereGeometry(.35,24,16),dark);hole.position.set(0,.35,.3);group.add(hole);
 } else {
   for(let i=0;i<3;i++){const ring=torus(.8,.12,i%2?ice:violet);ring.rotation.set(i*.8,i*.7,0);group.add(ring);}
   group.add(new T.Mesh(new T.IcosahedronGeometry(.3,1),ice));
 }
 group.rotation.set(.22,-.58,-.14); return group;
}
