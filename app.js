import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';

const app = document.getElementById('app');
const hud = document.getElementById('hud');
const placeLabel = document.getElementById('placeLabel');
const crosshair = document.getElementById('crosshair');
const interaction = document.getElementById('interaction');
const desktopHelp = document.getElementById('desktopHelp');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const pauseScreen = document.getElementById('pauseScreen');
const resumeButton = document.getElementById('resumeButton');
const mobileControls = document.getElementById('mobileControls');
const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
const lookPad = document.getElementById('lookPad');
const actionButton = document.getElementById('actionButton');

const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd3cd);
scene.fog = new THREE.FogExp2(0xbfd3cd, 0.0085);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 180);
camera.rotation.order = 'YXZ';
camera.position.set(-1.2, 1.66, 12.2);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  startScreen.innerHTML = '<div class="start-card"><h1>表示できません</h1><p class="lead">この端末ではWebGLを初期化できませんでした。WebGL対応ブラウザで開いてください。</p></div>';
  throw error;
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
app.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xd9e8e2, 0x665942, 1.8);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffedc5, 3.2);
sun.position.set(-24, 35, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
sun.shadow.bias = -0.00015;
scene.add(sun);

const warmFill = new THREE.PointLight(0xffd69c, 16, 18, 2);
warmFill.position.set(2, 2.2, -0.2);
scene.add(warmFill);

const colliders = [];
const interactables = [];
const animated = [];

function makeCanvasTexture(width, height, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const woodTexture = makeCanvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#76573b';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) {
    const y = Math.random() * h;
    const a = 0.04 + Math.random() * 0.07;
    ctx.strokeStyle = `rgba(35,20,11,${a})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.25, y + Math.random() * 8 - 4, w * 0.7, y + Math.random() * 10 - 5, w, y + Math.random() * 8 - 4);
    ctx.stroke();
  }
}, 3, 1);

const plasterTexture = makeCanvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#ddd3bb';
  ctx.fillRect(0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = Math.random() * 14 - 7;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);
}, 2, 2);

const tatamiTexture = makeCanvasTexture(256, 128, (ctx, w, h) => {
  ctx.fillStyle = '#a8a16b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(60,55,30,.16)';
  for (let y = 2; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (y % 9 === 0 ? 1 : 0));
    ctx.stroke();
  }
  ctx.fillStyle = '#635c3d';
  ctx.fillRect(0, 0, 7, h);
  ctx.fillRect(w - 7, 0, 7, h);
});

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x6f8050, roughness: 1 }),
  darkGrass: new THREE.MeshStandardMaterial({ color: 0x53653e, roughness: 1 }),
  plaster: new THREE.MeshStandardMaterial({ map: plasterTexture, roughness: 0.95 }),
  timber: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0x78583b, roughness: 0.85 }),
  darkTimber: new THREE.MeshStandardMaterial({ color: 0x3e3026, roughness: 0.9 }),
  floor: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0x9b7652, roughness: 0.82 }),
  tatami: new THREE.MeshStandardMaterial({ map: tatamiTexture, color: 0xb7b17a, roughness: 1 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x4d5351, roughness: 0.82 }),
  roofEdge: new THREE.MeshStandardMaterial({ color: 0x363b3a, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x88877b, roughness: 1 }),
  gravel: new THREE.MeshStandardMaterial({ color: 0xb0a995, roughness: 1 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xe9e3cf, roughness: 0.88, transparent: true, opacity: 0.82 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xc9e1de, roughness: 0.15, transmission: 0.24, transparent: true, opacity: 0.42, depthWrite: false }),
  metal: new THREE.MeshStandardMaterial({ color: 0x6f716c, roughness: 0.48, metalness: 0.65 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xd8d5c7, roughness: 0.35 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x847865, roughness: 1 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x829c82, roughness: 0.25, transparent: true, opacity: 0.58, metalness: 0.03 }),
  foliage: new THREE.MeshStandardMaterial({ color: 0x48683c, roughness: 1 }),
  foliage2: new THREE.MeshStandardMaterial({ color: 0x66854e, roughness: 1 }),
  straw: new THREE.MeshStandardMaterial({ color: 0xc0ad67, roughness: 1 }),
};

function box(size, position, material, { rotation = null, parent = scene, cast = true, receive = true, collide = false } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  if (collide) addCollider(mesh);
  return mesh;
}

function cylinder(radiusTop, radiusBottom, height, position, material, { segments = 16, parent = scene, collide = false } = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (collide) addCollider(mesh);
  return mesh;
}

function addCollider(object, dynamic = false, margin = 0.02) {
  const entry = { object, dynamic, margin, box: new THREE.Box3() };
  colliders.push(entry);
  return entry;
}

function refreshCollider(entry) {
  entry.object.updateWorldMatrix(true, false);
  entry.box.setFromObject(entry.object);
  if (entry.margin) entry.box.expandByScalar(entry.margin);
}

function addWall(x, z, w, d, h = 2.75, y = 1.45) {
  const wall = box([w, h, d], [x, y, z], materials.plaster, { collide: true });
  const cap = box([w + 0.04, 0.13, d + 0.04], [x, y + h / 2 - 0.09, z], materials.darkTimber);
  return { wall, cap };
}

function beam(size, position, parent = scene) {
  return box(size, position, materials.darkTimber, { parent, collide: false });
}

function windowFrame(x, y, z, width, height, onAxis = 'z') {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  scene.add(group);
  const depth = 0.07;
  const thick = 0.07;
  if (onAxis === 'z') {
    box([width, height, depth], [0, 0, 0], materials.glass, { parent: group, cast: false, receive: false });
    box([width + 0.12, thick, depth + 0.04], [0, height / 2, 0], materials.darkTimber, { parent: group });
    box([width + 0.12, thick, depth + 0.04], [0, -height / 2, 0], materials.darkTimber, { parent: group });
    box([thick, height, depth + 0.04], [-width / 2, 0, 0], materials.darkTimber, { parent: group });
    box([thick, height, depth + 0.04], [width / 2, 0, 0], materials.darkTimber, { parent: group });
    box([thick * 0.7, height, depth + 0.03], [0, 0, 0], materials.darkTimber, { parent: group });
  } else {
    box([depth, height, width], [0, 0, 0], materials.glass, { parent: group, cast: false, receive: false });
    box([depth + 0.04, thick, width + 0.12], [0, height / 2, 0], materials.darkTimber, { parent: group });
    box([depth + 0.04, thick, width + 0.12], [0, -height / 2, 0], materials.darkTimber, { parent: group });
    box([depth + 0.04, height, thick], [0, 0, -width / 2], materials.darkTimber, { parent: group });
    box([depth + 0.04, height, thick], [0, 0, width / 2], materials.darkTimber, { parent: group });
    box([depth + 0.03, height, thick * 0.7], [0, 0, 0], materials.darkTimber, { parent: group });
  }
  return group;
}

function createHingedDoor({ x, z, width = 1.25, height = 2.08, axis = 'z', hinge = 'left', inward = 1, label = '扉' }) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 0.12, z);
  scene.add(pivot);
  const sign = hinge === 'left' ? 1 : -1;
  const panel = box(
    axis === 'z' ? [width, height, 0.08] : [0.08, height, width],
    axis === 'z' ? [sign * width / 2, height / 2, 0] : [0, height / 2, sign * width / 2],
    materials.timber,
    { parent: pivot, collide: false }
  );
  const inset = box(
    axis === 'z' ? [width * 0.72, height * 0.56, 0.018] : [0.018, height * 0.56, width * 0.72],
    axis === 'z' ? [sign * width / 2, height * 0.52, inward * 0.05] : [inward * 0.05, height * 0.52, sign * width / 2],
    materials.plaster,
    { parent: pivot, cast: false }
  );
  const collider = addCollider(panel, true, 0.015);
  const item = {
    label,
    open: false,
    angle: 0,
    target: 0,
    focus: new THREE.Vector3(x, 1.2, z),
    action() {
      this.open = !this.open;
      this.target = this.open ? sign * inward * Math.PI * 0.5 : 0;
    },
    update(dt) {
      this.angle = THREE.MathUtils.damp(this.angle, this.target, 9, dt);
      pivot.rotation.y = this.angle;
      refreshCollider(collider);
    }
  };
  interactables.push(item);
  animated.push(item);
  return item;
}

function createSlidingDoors({ x, z, width = 2.4, height = 2.05, axis = 'x', label = '引き戸' }) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  scene.add(group);
  const panelA = new THREE.Group();
  const panelB = new THREE.Group();
  group.add(panelA, panelB);
  const each = width / 2;
  const makePanel = (parent, offset) => {
    if (axis === 'x') {
      box([each, height, 0.055], [offset, height / 2, 0], materials.paper, { parent, cast: false });
      box([each, 0.06, 0.08], [offset, 0.05, 0], materials.darkTimber, { parent });
      box([each, 0.06, 0.08], [offset, height - 0.05, 0], materials.darkTimber, { parent });
      for (let i = -1; i <= 1; i++) box([0.035, height, 0.075], [offset + i * each / 3, height / 2, 0], materials.darkTimber, { parent });
    } else {
      box([0.055, height, each], [0, height / 2, offset], materials.paper, { parent, cast: false });
      box([0.08, 0.06, each], [0, 0.05, offset], materials.darkTimber, { parent });
      box([0.08, 0.06, each], [0, height - 0.05, offset], materials.darkTimber, { parent });
      for (let i = -1; i <= 1; i++) box([0.075, height, 0.035], [0, height / 2, offset + i * each / 3], materials.darkTimber, { parent });
    }
  };
  makePanel(panelA, -each / 2);
  makePanel(panelB, each / 2);
  const colliderA = addCollider(panelA, true, 0.015);
  const colliderB = addCollider(panelB, true, 0.015);
  const item = {
    label,
    open: false,
    t: 0,
    target: 0,
    focus: new THREE.Vector3(x, 1.2, z),
    action() {
      this.open = !this.open;
      this.target = this.open ? 1 : 0;
    },
    update(dt) {
      this.t = THREE.MathUtils.damp(this.t, this.target, 8, dt);
      if (axis === 'x') {
        // Slide one leaf behind the other so half of the opening becomes fully passable.
        panelA.position.x = this.t * each;
        panelB.position.x = 0;
      } else {
        panelA.position.z = this.t * each;
        panelB.position.z = 0;
      }
      refreshCollider(colliderA);
      refreshCollider(colliderB);
    }
  };
  interactables.push(item);
  animated.push(item);
  return item;
}

function makeTatamiRoom(cx, cz, width, depth) {
  box([width, 0.09, depth], [cx, 0.09, cz], materials.tatami, { receive: true });
  const seamMat = materials.darkTimber;
  for (let x = cx - width / 2 + 0.9; x < cx + width / 2; x += 1.8) {
    box([0.022, 0.012, depth - 0.08], [x, 0.145, cz], seamMat, { cast: false });
  }
  for (let z = cz - depth / 2 + 0.9; z < cz + depth / 2; z += 1.8) {
    box([width - 0.08, 0.012, 0.022], [cx, 0.145, z], seamMat, { cast: false });
  }
}

function createRoof() {
  const roofGroup = new THREE.Group();
  scene.add(roofGroup);
  const angle = THREE.MathUtils.degToRad(27);
  const panelDepth = 5.7;
  box([15.1, 0.18, panelDepth], [0, 3.92, 2.55], materials.roof, { rotation: [-angle, 0, 0], parent: roofGroup });
  box([15.1, 0.18, panelDepth], [0, 3.92, -2.55], materials.roof, { rotation: [angle, 0, 0], parent: roofGroup });
  beam([15.25, 0.22, 0.22], [0, 5.14, 0], roofGroup);
  beam([15.35, 0.12, 0.18], [0, 2.75, 5.08], roofGroup);
  beam([15.35, 0.12, 0.18], [0, 2.75, -5.08], roofGroup);
}

function buildHouse() {
  // Foundation and floors — dimensions are original to this project.
  box([14.4, 0.22, 9.9], [0, 0.02, 0], materials.darkTimber, { receive: true });
  box([4.3, 0.10, 9.2], [-4.75, 0.16, 0], materials.floor, { receive: true });
  makeTatamiRoom(2.15, 2.35, 8.0, 4.35);
  box([8.0, 0.10, 4.3], [2.15, 0.16, -2.35], materials.floor, { receive: true });

  // Outer wall with two deliberately broad openings: front entry and veranda doors.
  addWall(-6.18, 4.86, 1.64, 0.16);
  addWall(-2.83, 4.86, 3.66, 0.16);
  addWall(6.02, 4.86, 1.96, 0.16);
  addWall(0, -4.86, 14.0, 0.16);
  addWall(-7.08, 0, 0.16, 9.56);
  addWall(7.08, 0, 0.16, 9.56);

  // Structural timber grid.
  for (const x of [-7.02, -5.34, -0.98, 4.98, 7.02]) beam([0.15, 2.95, 0.15], [x, 1.46, 4.79]);
  for (const x of [-7.02, 7.02]) {
    for (const z of [-4.72, -2.3, 0, 2.35, 4.72]) beam([0.15, 2.95, 0.15], [x, 1.46, z]);
  }
  beam([14.15, 0.16, 0.16], [0, 2.84, 4.76]);
  beam([14.15, 0.16, 0.16], [0, 2.84, -4.76]);

  // Interior partitions with original circulation.
  addWall(-2.54, 3.03, 0.14, 3.35);
  addWall(-2.54, -0.80, 0.14, 1.75);
  addWall(-2.54, -3.94, 0.14, 1.72);
  addWall(2.52, 0.0, 5.82, 0.13);
  addWall(6.14, 0.0, 1.73, 0.13);
  addWall(-4.76, -2.25, 4.46, 0.13);
  addWall(-4.76, -3.93, 4.46, 0.13);
  addWall(-5.92, -3.08, 0.13, 1.58);

  // Openable fittings.
  createHingedDoor({ x: -5.28, z: 4.79, width: 1.42, axis: 'z', hinge: 'left', inward: -1, label: '玄関の扉' });
  createSlidingDoors({ x: 2.02, z: 4.80, width: 5.95, height: 2.14, axis: 'x', label: '縁側の引き戸' });
  createSlidingDoors({ x: -2.53, z: 1.00, width: 1.95, height: 2.05, axis: 'z', label: '居間への引き戸' });
  createSlidingDoors({ x: -2.53, z: -2.30, width: 1.48, height: 2.02, axis: 'z', label: '台所の引き戸' });
  createSlidingDoors({ x: 5.20, z: 0.0, width: 1.85, height: 2.02, axis: 'x', label: '奥の間の引き戸' });

  // Windows.
  windowFrame(-6.99, 1.55, 1.8, 1.6, 1.05, 'x');
  windowFrame(-6.99, 1.55, -0.7, 1.45, 1.0, 'x');
  windowFrame(-6.99, 1.55, -3.25, 1.4, 0.95, 'x');
  windowFrame(6.99, 1.58, -2.2, 2.1, 1.05, 'x');
  windowFrame(2.1, 1.5, -4.77, 2.4, 1.0, 'z');
  windowFrame(5.3, 1.5, -4.77, 1.5, 1.0, 'z');

  // Veranda and steps.
  box([8.15, 0.16, 1.1], [2.1, 0.16, 5.35], materials.floor, { receive: true, collide: false });
  for (let x = -1.25; x <= 5.5; x += 1.35) beam([0.11, 0.62, 0.11], [x, -0.12, 5.38]);
  box([2.0, 0.10, 0.52], [1.8, 0.03, 6.02], materials.stone, { receive: true });

  // Entrance furniture.
  box([1.45, 0.82, 0.42], [-6.05, 0.55, 3.65], materials.timber, { collide: true });
  box([0.34, 0.14, 0.22], [-6.0, 1.02, 3.66], materials.ceramic);
  box([1.6, 0.08, 0.7], [-4.8, 0.08, 4.16], materials.stone);

  // Kitchen zone.
  box([2.8, 0.92, 0.62], [-5.48, 0.59, -1.2], materials.timber, { collide: true });
  box([1.15, 0.05, 0.48], [-5.98, 1.08, -1.18], materials.metal);
  box([0.72, 0.18, 0.48], [-4.78, 1.15, -1.18], materials.darkTimber);
  cylinder(0.22, 0.24, 0.25, [-4.78, 1.36, -1.18], materials.metal);
  box([0.8, 1.7, 0.42], [-6.3, 1.02, 0.45], materials.timber, { collide: true });
  for (let y = 0.55; y <= 1.55; y += 0.5) box([0.74, 0.04, 0.38], [-6.3, y, 0.44], materials.darkTimber);

  // Washroom and bath: generic period fixtures.
  box([1.18, 0.72, 1.15], [-5.85, 0.51, -3.08], materials.ceramic, { collide: true });
  box([0.9, 0.5, 0.55], [-3.35, 0.39, -3.1], materials.timber, { collide: true });
  cylinder(0.22, 0.18, 0.3, [-3.35, 0.78, -3.1], materials.ceramic);

  // Tatami room: low table, cushions, chest and display alcove.
  box([1.8, 0.13, 1.05], [1.2, 0.52, 2.2], materials.darkTimber, { collide: true });
  for (const [x, z, r] of [[0.2,2.2,0],[2.2,2.2,0], [1.2,1.25,0],[1.2,3.15,0]]) {
    box([0.68, 0.09, 0.62], [x, 0.23, z], materials.cloth, { rotation: [0, r, 0], collide: true });
  }
  box([1.45, 0.86, 0.45], [5.85, 0.61, 3.8], materials.timber, { collide: true });
  box([0.48, 0.12, 0.2], [5.8, 1.11, 3.8], materials.ceramic);
  cylinder(0.055, 0.07, 0.75, [5.96, 1.47, 3.8], materials.darkTimber);
  const vaseTop = cylinder(0.12, 0.18, 0.34, [5.2, 1.18, 3.8], materials.ceramic);
  vaseTop.rotation.z = 0.03;

  // Back living/study room.
  box([2.2, 0.12, 1.0], [1.6, 0.55, -2.1], materials.timber, { collide: true });
  box([0.88, 0.78, 0.82], [1.6, 0.48, -3.25], materials.darkTimber, { collide: true });
  box([2.0, 1.85, 0.38], [5.8, 1.04, -3.95], materials.timber, { collide: true });
  for (let y = 0.45; y < 1.8; y += 0.42) box([1.86, 0.045, 0.34], [5.8, y, -3.78], materials.darkTimber);
  // Books are neutral color blocks, not copied props.
  for (let i = 0; i < 14; i++) {
    const h = 0.18 + (i % 4) * 0.035;
    box([0.055 + (i % 3) * 0.012, h, 0.18], [5.05 + (i % 7) * 0.20, 0.38 + Math.floor(i / 7) * 0.43, -3.54], new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.06 + (i % 5) * 0.03, 0.18, 0.36 + (i % 4) * 0.04), roughness: 0.9 }));
  }

  // Hanging lamps.
  for (const [x, z] of [[1.8,2.3],[1.5,-2.2],[-5.0,-0.4]]) {
    cylinder(0.018, 0.018, 0.65, [x, 2.58, z], materials.darkTimber, { segments: 8 });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.28, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9b78d, roughness: 0.75, side: THREE.DoubleSide }));
    shade.position.set(x, 2.22, z);
    shade.castShadow = true;
    scene.add(shade);
    const light = new THREE.PointLight(0xffd99e, 5, 5, 2);
    light.position.set(x, 2.0, z);
    scene.add(light);
  }

  createRoof();
}

function makeTree(x, z, s = 1, variant = 0) {
  const trunk = cylinder(0.16 * s, 0.23 * s, 2.8 * s, [x, 1.35 * s, z], materials.darkTimber, { segments: 10, collide: true });
  trunk.rotation.z = (variant - 1) * 0.03;
  const crown = new THREE.Group();
  crown.position.set(x, 3.15 * s, z);
  scene.add(crown);
  const mat = variant % 2 ? materials.foliage2 : materials.foliage;
  for (const [dx, dy, dz, k] of [[0,0,0,1.35],[-.65,.05,.1,.9],[.55,.15,.3,1],[-.2,.45,-.45,.9],[.4,.5,-.3,.75]]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(k * s, 1), mat);
    leaf.position.set(dx * s, dy * s, dz * s);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    crown.add(leaf);
  }
}

function makeShrub(x, z, s = 1) {
  const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48 * s, 1), materials.foliage2);
  shrub.position.set(x, 0.42 * s, z);
  shrub.scale.y = 0.72;
  shrub.castShadow = true;
  shrub.receiveShadow = true;
  scene.add(shrub);
}

function makeStone(x, z, s = 1, rot = 0) {
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 * s, 0), materials.stone);
  stone.position.set(x, 0.10 + 0.08 * s, z);
  stone.scale.set(1.4, 0.45, 1.0);
  stone.rotation.y = rot;
  stone.castShadow = true;
  stone.receiveShadow = true;
  scene.add(stone);
}

function buildLandscape() {
  box([120, 0.18, 120], [0, -0.16, 0], materials.grass, { receive: true, cast: false });

  // Garden gravel patch and irregular stepping stones.
  box([15.2, 0.035, 7.4], [0, -0.01, 8.6], materials.gravel, { receive: true, cast: false });
  const stones = [[-1.2,7.0],[0.1,8.0],[-0.6,9.1],[-1.3,10.2],[-1.1,11.35],[-0.2,12.6],[0.8,13.6]];
  stones.forEach(([x,z], i) => makeStone(x, z, 0.9 + (i % 3) * 0.08, i * 0.37));

  // Vegetable plot, deliberately offset from the house.
  box([10.6, 0.05, 8.5], [-13.6, 0, 3.5], materials.soil, { receive: true, cast: false });
  for (let x = -17.6; x <= -9.8; x += 1.35) {
    box([0.6, 0.13, 7.1], [x, 0.08, 3.5], materials.soil, { receive: true, cast: false });
    for (let z = 0.6; z <= 6.4; z += 0.7) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), materials.foliage2);
      leaf.position.set(x, 0.26, z + ((Math.round(x * 10) + Math.round(z * 10)) % 2) * 0.08);
      leaf.scale.set(1.3, 0.65, 0.85);
      leaf.castShadow = true;
      scene.add(leaf);
    }
  }

  // Rice paddies with low ridges and sparse rows.
  for (const field of [[16,3,12,14],[15,-14,15,13],[-16,-15,13,12]]) {
    const [x,z,w,d] = field;
    box([w, 0.035, d], [x, -0.025, z], materials.water, { receive: true, cast: false });
    for (let rz = z - d / 2 + 0.75; rz < z + d / 2; rz += 1.25) {
      for (let rx = x - w / 2 + 0.7; rx < x + w / 2; rx += 1.1) {
        const rice = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.48, 5), materials.straw);
        rice.position.set(rx, 0.20, rz);
        rice.castShadow = false;
        scene.add(rice);
      }
    }
    box([w + 0.8, 0.18, 0.45], [x, 0.05, z - d / 2 - 0.25], materials.darkGrass, { receive: true, cast: false });
    box([w + 0.8, 0.18, 0.45], [x, 0.05, z + d / 2 + 0.25], materials.darkGrass, { receive: true, cast: false });
  }

  // Small utility shed — plain agricultural architecture.
  const shed = new THREE.Group();
  shed.position.set(-15, 0, 13.2);
  scene.add(shed);
  box([4.1, 0.16, 3.2], [0, 0.02, 0], materials.darkTimber, { parent: shed });
  box([4.0, 2.35, 0.15], [0, 1.25, -1.52], materials.timber, { parent: shed, collide: true });
  box([0.15, 2.35, 3.0], [-1.92, 1.25, 0], materials.timber, { parent: shed, collide: true });
  box([0.15, 2.35, 3.0], [1.92, 1.25, 0], materials.timber, { parent: shed, collide: true });
  box([4.4, 0.16, 3.65], [0, 2.55, 0], materials.roof, { rotation: [0,0,-0.09], parent: shed });
  box([1.0, 1.95, 0.08], [-0.7, 1.07, 1.52], materials.darkTimber, { parent: shed });
  box([1.0, 1.95, 0.08], [0.7, 1.07, 1.52], materials.darkTimber, { parent: shed });

  // Simple hand-pump well form, generic and non-character-specific.
  cylinder(0.72, 0.82, 0.62, [8.8, 0.29, 9.0], materials.stone, { segments: 18, collide: true });
  cylinder(0.47, 0.47, 0.66, [8.8, 0.48, 9.0], materials.water, { segments: 18 });
  cylinder(0.07, 0.07, 1.15, [8.8, 1.10, 9.0], materials.metal, { segments: 8 });
  const handle = box([0.08, 0.08, 0.9], [8.8, 1.58, 9.26], materials.metal);
  handle.rotation.x = 0.25;

  // Fence and gate line.
  for (let x = -7.4; x <= 7.4; x += 1.45) {
    if (x > -1.1 && x < 1.1) continue;
    cylinder(0.045, 0.055, 0.9, [x, 0.42, 12.2], materials.darkTimber, { segments: 6 });
  }
  box([6.1, 0.055, 0.07], [-4.3, 0.62, 12.2], materials.darkTimber);
  box([6.1, 0.055, 0.07], [4.3, 0.62, 12.2], materials.darkTimber);

  // Trees and shrubs form a loose windbreak rather than any specific film composition.
  const trees = [
    [-20,11,1.1,0],[-22,4,1.3,1],[-20,-5,1.0,2],[-11,-15,1.3,0],[-4,-17,1.15,1],
    [7,-17,1.45,2],[23,-7,1.15,0],[24,5,1.5,1],[20,16,1.35,2],[10,20,1.0,0],[-5,22,1.2,1],[-20,20,1.35,2]
  ];
  trees.forEach(t => makeTree(...t));
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const r = 18 + (i % 5) * 2.8;
    makeShrub(Math.cos(a) * r, Math.sin(a) * r, 0.6 + (i % 3) * 0.18);
  }

  // Distant low hills, intentionally abstract.
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6a8065, roughness: 1 });
  for (const [x,z,sx,sy] of [[-46,-32,22,8],[28,-44,28,10],[47,4,25,8],[-40,35,27,9],[12,52,32,10]]) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), hillMat);
    hill.scale.set(sx, sy, sx * 0.55);
    hill.position.set(x, -sy * 0.50, z);
    hill.receiveShadow = true;
    scene.add(hill);
  }
}

buildLandscape();
buildHouse();
scene.updateMatrixWorld(true);
colliders.forEach(refreshCollider);

// Player and controls.
const player = {
  position: camera.position.clone(),
  radius: 0.28,
  eyeHeight: 1.66,
  speed: 2.35,
  runSpeed: 4.25,
};
let yaw = 0;
let pitch = -0.03;
let started = false;
let active = false;
const keys = new Set();
const joystickVector = new THREE.Vector2();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const testPos = new THREE.Vector3();
const clock = new THREE.Clock();
let focusedInteractable = null;

function canOccupy(pos) {
  if (Math.abs(pos.x) > 45 || Math.abs(pos.z) > 45) return false;
  for (const entry of colliders) {
    if (entry.dynamic) refreshCollider(entry);
    const b = entry.box;
    if (
      pos.x + player.radius > b.min.x &&
      pos.x - player.radius < b.max.x &&
      pos.z + player.radius > b.min.z &&
      pos.z - player.radius < b.max.z &&
      player.eyeHeight > b.min.y - 0.05 &&
      0.08 < b.max.y
    ) return false;
  }
  return true;
}

function applyMovement(dt) {
  let ix = 0;
  let iz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  ix += joystickVector.x;
  iz += -joystickVector.y;
  const len = Math.hypot(ix, iz);
  if (len < 0.04) return;
  ix /= Math.max(1, len);
  iz /= Math.max(1, len);
  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  move.copy(forward).multiplyScalar(iz).addScaledVector(right, ix);
  if (move.lengthSq() > 1) move.normalize();
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? player.runSpeed : player.speed;
  move.multiplyScalar(speed * Math.min(dt, 0.05));

  // Axis-separated collision gives smooth wall sliding.
  testPos.copy(player.position);
  testPos.x += move.x;
  if (canOccupy(testPos)) player.position.x = testPos.x;
  testPos.copy(player.position);
  testPos.z += move.z;
  if (canOccupy(testPos)) player.position.z = testPos.z;
  camera.position.set(player.position.x, player.eyeHeight, player.position.z);
}

function updateFocusedInteractable() {
  focusedInteractable = null;
  const look = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).setY(0).normalize();
  let best = Infinity;
  for (const item of interactables) {
    const flat = item.focus.clone().sub(player.position);
    flat.y = 0;
    const distance = flat.length();
    if (distance > 2.35 || distance < 0.05) continue;
    const alignment = look.dot(flat.normalize());
    if (alignment < 0.42) continue;
    const score = distance - alignment * 0.4;
    if (score < best) {
      best = score;
      focusedInteractable = item;
    }
  }
  if (focusedInteractable) {
    interaction.textContent = `${isTouch ? '' : 'F  '} ${focusedInteractable.label}を${focusedInteractable.open ? '閉じる' : '開く'}`.trim();
    interaction.classList.add('show');
  } else {
    interaction.classList.remove('show');
  }
}

function triggerInteraction() {
  updateFocusedInteractable();
  if (focusedInteractable) focusedInteractable.action();
}

function updatePlaceLabel() {
  const { x, z } = player.position;
  let label = '前庭';
  if (x > 7.5 || x < -7.5 || z > 5.2 || z < -5.2) {
    if (x < -8 && z < 8) label = '菜園';
    else if (x < -10 && z > 9) label = '物置のそば';
    else if (x > 7 && z > 5) label = '井戸の庭';
    else if (z < -7) label = '田のあぜ';
    else if (z > 11) label = '小道';
    else label = '庭';
  } else if (x < -2.5) {
    if (z > 2.25) label = '玄関';
    else if (z < -2.3) label = '洗面・浴室';
    else label = '台所';
  } else {
    if (z > 0) label = '畳の間';
    else label = '居間・書斎';
  }
  if (placeLabel.textContent !== label) placeLabel.textContent = label;
}

function animate() {
  const dt = clock.getDelta();
  for (const item of animated) item.update(dt);
  if (active || isTouch && started) applyMovement(dt);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  updateFocusedInteractable();
  updatePlaceLabel();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

function showWalkUI() {
  hud.classList.add('visible');
  if (!isTouch) {
    desktopHelp.classList.add('visible');
    crosshair.classList.add('visible');
  } else {
    mobileControls.classList.add('active');
  }
}

function beginWalk() {
  started = true;
  startScreen.classList.add('hidden');
  pauseScreen.hidden = true;
  showWalkUI();
  if (isTouch) {
    active = true;
  } else {
    renderer.domElement.requestPointerLock?.();
  }
}

startButton.addEventListener('click', beginWalk);
resumeButton.addEventListener('click', () => {
  pauseScreen.hidden = true;
  renderer.domElement.requestPointerLock?.();
});

renderer.domElement.addEventListener('click', () => {
  if (started && !isTouch && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.();
});

document.addEventListener('pointerlockchange', () => {
  if (isTouch || !started) return;
  active = document.pointerLockElement === renderer.domElement;
  pauseScreen.hidden = active;
  if (active) {
    desktopHelp.classList.add('visible');
    crosshair.classList.add('visible');
  } else {
    desktopHelp.classList.remove('visible');
    crosshair.classList.remove('visible');
    interaction.classList.remove('show');
  }
});

document.addEventListener('mousemove', (event) => {
  if (!active || isTouch) return;
  yaw -= event.movementX * 0.00205;
  pitch -= event.movementY * 0.0018;
  pitch = THREE.MathUtils.clamp(pitch, -1.28, 1.28);
});

addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyF' && !event.repeat && started) triggerInteraction();
});
addEventListener('keyup', (event) => keys.delete(event.code));
addEventListener('blur', () => keys.clear());

// Mobile joystick.
let joyPointer = null;
function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = event.clientX - cx;
  let dy = event.clientY - cy;
  const max = rect.width * 0.34;
  const d = Math.hypot(dx, dy);
  if (d > max) { dx = dx / d * max; dy = dy / d * max; }
  joystickVector.set(dx / max, dy / max);
  joystickKnob.style.transform = `translate(${dx}px,${dy}px)`;
}
joystick.addEventListener('pointerdown', (event) => {
  joyPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
joystick.addEventListener('pointermove', (event) => {
  if (event.pointerId === joyPointer) updateJoystick(event);
});
function endJoy(event) {
  if (event.pointerId !== joyPointer) return;
  joyPointer = null;
  joystickVector.set(0, 0);
  joystickKnob.style.transform = 'translate(0,0)';
}
joystick.addEventListener('pointerup', endJoy);
joystick.addEventListener('pointercancel', endJoy);

let lookPointer = null;
let lookX = 0;
let lookY = 0;
lookPad.addEventListener('pointerdown', (event) => {
  lookPointer = event.pointerId;
  lookX = event.clientX;
  lookY = event.clientY;
  lookPad.setPointerCapture(event.pointerId);
});
lookPad.addEventListener('pointermove', (event) => {
  if (event.pointerId !== lookPointer) return;
  const dx = event.clientX - lookX;
  const dy = event.clientY - lookY;
  lookX = event.clientX;
  lookY = event.clientY;
  yaw -= dx * 0.0042;
  pitch -= dy * 0.0036;
  pitch = THREE.MathUtils.clamp(pitch, -1.22, 1.22);
});
lookPad.addEventListener('pointerup', (event) => { if (event.pointerId === lookPointer) lookPointer = null; });
lookPad.addEventListener('pointercancel', (event) => { if (event.pointerId === lookPointer) lookPointer = null; });
actionButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  triggerInteraction();
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
});

// Keep browser gestures from hijacking the immersive controls.
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('touchmove', event => {
  if (started) event.preventDefault();
}, { passive: false });
