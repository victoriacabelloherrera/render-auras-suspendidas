// proyes
const proyectoresList = [];

// 1. Escena, Cámara y Renderizador
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030106, 0.03);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2.2, 7.0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// sliders UI
const zoomSlider = document.getElementById('zoomSlider');
zoomSlider.addEventListener('input', (e) => {
  const zoomVal = parseFloat(e.target.value);
  const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(direction, zoomVal);
});

const lightSlider = document.getElementById('lightSlider');
lightSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  proyectoresList.forEach(item => {
    item.spotLight.intensity = val;
    item.coneMesh.material.opacity = val * 0.008;
  });
});

// 2. Iluminación Ambiental
const ambientLight = new THREE.AmbientLight(0x1a0033, 0.2);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0x4a0080, 0.25);
mainLight.position.set(0, 5, 2);
scene.add(mainLight);

// 3. Piso y Rejilla
const floorGeo = new THREE.PlaneGeometry(14, 14);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x05020a, roughness: 0.8, metalness: 0.1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(14, 28, 0x4a148c, 0x120024);
grid.position.y = 0.01;
scene.add(grid);

// TEXTURA Y MATERIAL DE TUL
function generarTexturaTul() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 64; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, 64);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i); ctx.lineTo(64, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

const texturaTul = generarTexturaTul();

const materialTulUnificado = new THREE.MeshStandardMaterial({
  color: 0x8a2be2,
  emissive: 0x240046,
  emissiveIntensity: 0.3,
  alphaMap: texturaTul,
  transparent: true,
  opacity: 0.22,
  roughness: 0.3,
  metalness: 0.1,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

// Generador Catenarias en "U"
function crearCatenaria(p1, p2, caida, ancho, fase) {
  const group = new THREE.Group();
  const segsU = 40, segsV = 16;
  const geo = new THREE.PlaneGeometry(1, 1, segsU, segsV);
  const pos = geo.attributes.position;

  for (let i = 0; i <= segsU; i++) {
    const t = i / segsU;
    const xBase = p1.x + (p2.x - p1.x) * t;
    const zBase = p1.z + (p2.z - p1.z) * t;
    const yBase = p1.y + (p2.y - p1.y) * t;

    const factorU = 4 * t * (1 - t);
    const sagY = yBase - (caida * factorU);

    for (let j = 0; j <= segsV; j++) {
      const v = j / segsV;
      const index = i * (segsV + 1) + j;
      const pliegue = Math.sin(t * 12 + fase) * 0.12 * factorU;

      pos.setX(index, xBase + (v - 0.5) * ancho * 0.2 + pliegue);
      pos.setY(index, sagY - (v * ancho * 0.6));
      pos.setZ(index, zBase + pliegue);
    }
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, materialTulUnificado);
  mesh.castShadow = true;
  group.add(mesh);

  [p1, p2].forEach(p => {
    const points = [p, new THREE.Vector3(p.x, 4.2, p.z)];
    const tanzaGeo = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(tanzaGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })));
  });

  return group;
}

// 4B. Generador Pantallas Colgantes Largas (1.5 m x 2.5 m)
function crearPantallaColgante(x, y, z, rotY, ancho, alto, fase) {
  const group = new THREE.Group();
  const segsX = 32, segsY = 32;
  const geo = new THREE.PlaneGeometry(ancho, alto, segsX, segsY);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pliegueComplejo = Math.sin(py * 4.0 + px * 3.0 + fase) * 0.35 + Math.cos(px * 4.0) * 0.18;
    pos.setZ(i, pliegueComplejo);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, materialTulUnificado);
  mesh.position.y = alto / 2;
  mesh.castShadow = true;
  group.add(mesh);

  [-ancho / 2, ancho / 2].forEach(offX => {
    const points = [new THREE.Vector3(offX, alto, 0), new THREE.Vector3(offX, 4.2 - y, 0)];
    const tanzaGeo = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(tanzaGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })));
  });

  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

// 6 TELAS EN "U"
scene.add(crearCatenaria(new THREE.Vector3(-2.8, 4.0, -2.2), new THREE.Vector3(2.8, 4.0, -2.2), 2.2, 1.5, 0.0));
scene.add(crearCatenaria(new THREE.Vector3(-2.5, 3.8, -1.2), new THREE.Vector3(1.8, 3.8,  1.2), 2.6, 1.5, 1.5));
scene.add(crearCatenaria(new THREE.Vector3(-1.8, 3.8,  1.2), new THREE.Vector3(2.5, 3.8, -1.2), 2.4, 1.5, 3.0));
scene.add(crearCatenaria(new THREE.Vector3(-2.8, 3.9,  0.0), new THREE.Vector3(2.8, 3.9,  0.0), 2.1, 1.5, 4.5));
scene.add(crearCatenaria(new THREE.Vector3(-2.2, 3.7,  1.2), new THREE.Vector3(2.2, 3.7,  1.2), 2.5, 1.5, 2.1));
scene.add(crearCatenaria(new THREE.Vector3(-2.0, 3.6,  2.0), new THREE.Vector3(2.0, 3.6,  2.0), 2.3, 1.5, 5.2));

// 6 TELAS LARGAS VERTICALES
scene.add(crearPantallaColgante(-1.8, 0.2, -1.8,  0.3,          1.5, 2.5, 1.1));
scene.add(crearPantallaColgante( 1.8, 0.2, -1.8, -0.3,          1.5, 2.5, 2.2));

scene.add(crearPantallaColgante(-1.1, 0.2, -0.6,  Math.PI / 4,  1.5, 2.5, 0.5)); 
scene.add(crearPantallaColgante( 1.0, 0.2, -0.8, -Math.PI / 3,  1.5, 2.5, 2.8)); 

scene.add(crearPantallaColgante(-1.2, 0.2,  1.2, -0.2,          1.5, 2.5, 3.3));
scene.add(crearPantallaColgante( 1.2, 0.2,  1.2,  0.4,          1.5, 2.5, 1.9));

// Proyectores
function crearProyectorEstructural(x, y, z, targetX, targetY, targetZ, colorHex) {
  const projGroup = new THREE.Group();

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.25, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })
  );
  projGroup.add(box);

  const lente = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16),
    new THREE.MeshBasicMaterial({ color: colorHex })
  );
  lente.rotation.x = Math.PI / 2;
  lente.position.z = -0.26;
  projGroup.add(lente);

  const anguloApertura = Math.PI / 6; 
  const spotLight = new THREE.SpotLight(colorHex, 1.0, 25, anguloApertura, 0.5, 1);
  spotLight.position.set(0, 0, 0);

  const targetObj = new THREE.Object3D();
  targetObj.position.set(targetX, targetY, targetZ);
  scene.add(targetObj);
  spotLight.target = targetObj;
  projGroup.add(spotLight);

  const distTotal = new THREE.Vector3(x, y, z).distanceTo(new THREE.Vector3(targetX, targetY, targetZ));
  const largoCone = distTotal * 0.45; 
  const radioBase = largoCone * Math.tan(anguloApertura);
  
  const coneGeo = new THREE.ConeGeometry(radioBase, largoCone, 32, 1, true);
  coneGeo.translate(0, -largoCone / 2, 0);
  coneGeo.rotateX(-Math.PI / 2);

  const coneMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.008,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  projGroup.add(coneMesh);

  projGroup.position.set(x, y, z);
  projGroup.lookAt(targetX, targetY, targetZ);

  proyectoresList.push({ spotLight, coneMesh });

  return projGroup;
}

scene.add(crearProyectorEstructural(-5.0, 3.8, -3.8, -0.8, 1.8, -0.8, 0xff7700));
scene.add(crearProyectorEstructural( 5.0, 3.8,  3.8,  0.8, 1.8,  0.8, 0xaa00ff));

// Sistema de Cotas y Medidas Visuales
const cotasGroup = new THREE.Group();
cotasGroup.visible = false;

function crearTextoEtiqueta(texto) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256; canvas.height = 64;
  ctx.fillStyle = 'rgba(10, 5, 20, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'Bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.2, 0.3, 1);
  return sprite;
}

function crearLineaCota(p1, p2, texto) {
  const group = new THREE.Group();
  const points = [p1, p2];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({ color: 0x00ffff, dashSize: 0.1, gapSize: 0.05 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  group.add(line);

  const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const etiqueta = crearTextoEtiqueta(texto);
  etiqueta.position.copy(midPoint);
  group.add(etiqueta);

  return group;
}

// Límites de Obra
const boxEspacio = new THREE.Box3(new THREE.Vector3(-3, 0, -3), new THREE.Vector3(3, 4.2, 3));
cotasGroup.add(new THREE.Box3Helper(boxEspacio, 0x00ffff));

cotasGroup.add(crearLineaCota(new THREE.Vector3(-3, 0, 3.2), new THREE.Vector3(3, 0, 3.2), "Ancho Obra: 6.0 m"));
cotasGroup.add(crearLineaCota(new THREE.Vector3(3.2, 0, -3), new THREE.Vector3(3.2, 0, 3), "Prof. Obra: 4.5 m"));
cotasGroup.add(crearLineaCota(new THREE.Vector3(-3.2, 0, -3), new THREE.Vector3(-3.2, 4.2, -3), "Alt. Espacio: 4.2 m"));
cotasGroup.add(crearLineaCota(new THREE.Vector3(-5.0, 0, -3.8), new THREE.Vector3(-5.0, 3.8, -3.8), "Alt. Proyector: 3.8 m"));

// Medidas Tul Largo
const posTulEjemplo = new THREE.Vector3(1.8, 0.2, -1.8);
cotasGroup.add(crearLineaCota(
  new THREE.Vector3(posTulEjemplo.x - 0.75, posTulEjemplo.y + 2.7, posTulEjemplo.z),
  new THREE.Vector3(posTulEjemplo.x + 0.75, posTulEjemplo.y + 2.7, posTulEjemplo.z),
  "Ancho Tul: 1.5 m"
));
cotasGroup.add(crearLineaCota(
  new THREE.Vector3(posTulEjemplo.x + 0.9, posTulEjemplo.y),
  new THREE.Vector3(posTulEjemplo.x + 0.9, posTulEjemplo.y + 2.5, posTulEjemplo.z),
  "Alto Tul: 2.5 m"
));

scene.add(cotasGroup);

// Botón Cotas
const toggleBtn = document.getElementById('toggleCotasBtn');
toggleBtn.addEventListener('click', () => {
  cotasGroup.visible = !cotasGroup.visible;
  toggleBtn.style.background = cotasGroup.visible ? '#00aaaa' : '#8a2be2';
});

// 8. Animación
function animate() {
  requestAnimationFrame(animate);
  const currentDist = camera.position.distanceTo(controls.target);
  zoomSlider.value = currentDist.toFixed(1);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});