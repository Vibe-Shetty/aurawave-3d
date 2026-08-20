import { state } from './state.js';

// ============================================================================
// 2. Three.js Scene Setup
// ============================================================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07090e, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, state.cameraBaseY, state.cameraBaseZ);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x06b6d4, 3, 200);
pointLight1.position.set(40, 50, 40);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xec4899, 3, 200);
pointLight2.position.set(-40, -30, -40);
scene.add(pointLight2);

// ============================================================================
// 3. 3D Particle Geometries
// ============================================================================

const PARTICLE_COUNT = 6400; // 80x80
const GRID_SIZE = 80;
const SPACING = 2.5;

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const wavePositions = new Float32Array(PARTICLE_COUNT * 3);
const spherePositions = new Float32Array(PARTICLE_COUNT * 3);
const sphereLatitudes = new Float32Array(PARTICLE_COUNT);
const tunnelPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);

// Generate Wave Grid Layout
let pIdx = 0;
for (let x = 0; x < GRID_SIZE; x++) {
  for (let z = 0; z < GRID_SIZE; z++) {
    const px = (x - GRID_SIZE / 2) * SPACING;
    const py = 0;
    const pz = (z - GRID_SIZE / 2) * SPACING;

    wavePositions[pIdx] = px;
    wavePositions[pIdx + 1] = py;
    wavePositions[pIdx + 2] = pz;

    positions[pIdx] = px;
    positions[pIdx + 1] = py;
    positions[pIdx + 2] = pz;

    const colorRatio = (x + z) / (GRID_SIZE * 2);
    colors[pIdx] = THREE.MathUtils.lerp(0.02, 0.92, colorRatio);
    colors[pIdx + 1] = THREE.MathUtils.lerp(0.71, 0.28, colorRatio);
    colors[pIdx + 2] = THREE.MathUtils.lerp(0.83, 0.60, colorRatio);

    pIdx += 3;
  }
}

// Generate Aesthetic Harmonic Cyber Sphere Layout
const phi = Math.PI * (3 - Math.sqrt(5));
const sphereBaseRadius = 24.0;
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = phi * i;

  spherePositions[i * 3] = Math.cos(theta) * radiusAtY * sphereBaseRadius;
  spherePositions[i * 3 + 1] = y * sphereBaseRadius;
  spherePositions[i * 3 + 2] = Math.sin(theta) * radiusAtY * sphereBaseRadius;
  sphereLatitudes[i] = y;
}

// Generate Hyperspace Vortex Tunnel Layout
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const angle = (i % 64) * ((Math.PI * 2) / 64);
  const ringIdx = Math.floor(i / 64);
  const radius = 12 + Math.sin(ringIdx * 0.15) * 3;
  const z = (ringIdx - 50) * 4;

  tunnelPositions[i * 3] = Math.cos(angle) * radius;
  tunnelPositions[i * 3 + 1] = Math.sin(angle) * radius;
  tunnelPositions[i * 3 + 2] = z;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Particle Texture
const canvas = document.createElement('canvas');
canvas.width = 64;
canvas.height = 64;
const ctx = canvas.getContext('2d');
const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(0.3, 'rgba(6,182,212,0.85)');
grad.addColorStop(0.7, 'rgba(236,72,153,0.35)');
grad.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = grad;
ctx.beginPath();
ctx.arc(32, 32, 32, 0, Math.PI * 2);
ctx.fill();

const particleTexture = new THREE.CanvasTexture(canvas);

const material = new THREE.PointsMaterial({
  size: 1.6,
  map: particleTexture,
  vertexColors: true,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

// Aesthetic Ambient Outer Ring
const ringGeo = new THREE.RingGeometry(28, 29, 64);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0x06b6d4,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.25,
  wireframe: true
});
const ringMesh = new THREE.Mesh(ringGeo, ringMat);
ringMesh.rotation.x = Math.PI / 2;
scene.add(ringMesh);

// Dynamic Viewport & Orientation Adaptor
function handleResponsiveLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;

  camera.aspect = width / height;

  if (isPortrait) {
    camera.fov = 75;
    state.cameraBaseZ = 65;
    state.cameraBaseY = 28;
    material.size = 1.3;
  } else {
    camera.fov = 60;
    state.cameraBaseZ = 45;
    state.cameraBaseY = 18;
    material.size = 1.6;
  }

  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener('resize', handleResponsiveLayout);
handleResponsiveLayout();

// ============================================================================
// 10. Smooth Physics & Three.js Render Loop
// ============================================================================

document.addEventListener('mousemove', (e) => {
  state.mouseX = (e.clientX - window.innerWidth / 2) * 0.04;
  state.mouseY = (e.clientY - window.innerHeight / 2) * 0.04;
});

function animate() {
  requestAnimationFrame(animate);

  let avgFrequency = 0;
  if (state.analyser && state.isPlaying && state.dataArray) {
    state.analyser.getByteFrequencyData(state.dataArray);
    let sum = 0;
    for (let i = 0; i < state.dataArray.length; i++) {
      sum += state.dataArray[i];
    }
    avgFrequency = sum / state.dataArray.length;
    state.targetEnergy = 0.35 + (avgFrequency / 255) * 0.85;
  } else {
    state.targetEnergy = 0.0;
    if (state.dataArray) {
      for (let i = 0; i < state.dataArray.length; i++) {
        state.dataArray[i] = Math.floor(state.dataArray[i] * 0.9);
      }
    }
  }

  state.currentEnergy += (state.targetEnergy - state.currentEnergy) * 0.04;
  state.time += (0.001 + 0.022 * state.currentEnergy) * state.themeSpeed;

  state.targetX += (state.mouseX - state.targetX) * 0.05;
  state.targetY += (state.mouseY - state.targetY) * 0.05;

  if (state.currentGeometryMode === 'tunnel') {
    camera.position.set(0, 0, state.cameraBaseZ + 15);
  } else {
    camera.position.x = Math.sin(state.time * 0.2) * (4 + 12 * state.currentEnergy) + state.targetX;
    camera.position.y = state.cameraBaseY + state.targetY;
    camera.position.z = state.cameraBaseZ;
  }
  camera.lookAt(0, 0, 0);

  ringMesh.rotation.z += 0.0005 + 0.0025 * state.currentEnergy;

  const posAttr = geometry.attributes.position;
  const posArr = posAttr.array;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const freqIdx = Math.min(i % 128, (state.dataArray ? state.dataArray.length - 1 : 0));
    const audioVal = state.dataArray ? (state.dataArray[freqIdx] / 255) : 0;

    if (state.currentGeometryMode === 'wave') {
      const initX = wavePositions[i3];
      const initZ = wavePositions[i3 + 2];
      const dist = Math.sqrt(initX * initX + initZ * initZ);
      
      const freqBoost = audioVal * 26 * state.themeWaveIntensity * state.currentEnergy;
      const waveElevation = (Math.sin(dist * 0.12 - state.time * 2) * 5 + Math.cos(initX * 0.1 + state.time) * 3.5) * state.currentEnergy;

      posArr[i3] = initX;
      posArr[i3 + 1] = waveElevation + freqBoost;
      posArr[i3 + 2] = initZ;

    } else if (state.currentGeometryMode === 'sphere') {
      const sx = spherePositions[i3];
      const sy = spherePositions[i3 + 1];
      const sz = spherePositions[i3 + 2];
      const lat = sphereLatitudes[i];

      const surfaceRipple = Math.sin(lat * 8 - state.time * 3) * (audioVal * 4.5 * state.themeWaveIntensity * state.currentEnergy);
      const pulseMultiplier = 1.0 + (audioVal * 0.18 * state.themeWaveIntensity * state.currentEnergy);

      const rotAngle = state.time * 0.25;
      const cosA = Math.cos(rotAngle);
      const sinA = Math.sin(rotAngle);

      posArr[i3] = (sx * cosA - sz * sinA) * pulseMultiplier;
      posArr[i3 + 1] = (sy + surfaceRipple) * pulseMultiplier;
      posArr[i3 + 2] = (sx * sinA + sz * cosA) * pulseMultiplier;

    } else if (state.currentGeometryMode === 'tunnel') {
      const tx = tunnelPositions[i3];
      const ty = tunnelPositions[i3 + 1];
      let tz = tunnelPositions[i3 + 2] + (state.time * 40) % 400 - 200;

      const tunnelRadiusBoost = 1.0 + audioVal * 0.6 * state.themeWaveIntensity * state.currentEnergy;

      posArr[i3] = tx * tunnelRadiusBoost;
      posArr[i3 + 1] = ty * tunnelRadiusBoost;
      posArr[i3 + 2] = tz;
    }
  }

  posAttr.needsUpdate = true;
  renderer.render(scene, camera);
}

animate();

// Initialize Playlist Drawer View
renderPlaylistDrawer();

// Helper for memory management
function disposeObject(obj) {
  if (obj.geometry) {
    obj.geometry.dispose();
  }
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    } else {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  }
  if (obj.children) {
    obj.children.forEach(disposeObject);
  }
}

// Attach to window for global access between modules
window.handleResponsiveLayout = handleResponsiveLayout;
window.animate = animate;
window.renderer = renderer;
window.disposeObject = disposeObject;
