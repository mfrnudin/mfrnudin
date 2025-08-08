import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoundedBoxGeometry } from "https://unpkg.com/three@0.161.0/examples/jsm/geometries/RoundedBoxGeometry.js";

const canvas = document.getElementById("scene");
const turnEl = document.getElementById("turn");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");

// Chess rules via global chess.js
const game = new window.Chess();

// Scene setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090e);
scene.fog = new THREE.FogExp2(0x07090e, 0.04);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
const startCamPos = new THREE.Vector3(9, 12, 14);
camera.position.copy(startCamPos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 10;
controls.maxDistance = 28;

// Lights
const hemi = new THREE.HemisphereLight(0x99ddff, 0x08090d, 0.8);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(8, 16, 10);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.near = 1;
dir.shadow.camera.far = 60;
dir.shadow.camera.left = -18;
dir.shadow.camera.right = 18;
dir.shadow.camera.top = 18;
dir.shadow.camera.bottom = -18;
scene.add(dir);

// Subtle rim lights
const rim1 = new THREE.PointLight(0x00ffff, 1.2, 40, 2);
rim1.position.set(-10, 6, -8);
scene.add(rim1);
const rim2 = new THREE.PointLight(0xff00ff, 1.2, 40, 2);
rim2.position.set(10, 6, 8);
scene.add(rim2);

// Postprocessing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.8, 0.85);
composer.addPass(bloom);

// Floor with subtle reflection grid
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.65, metalness: 0.25 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 72), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

// Neon grid ring accents
function makeRing(radius, color) {
  const geo = new THREE.RingGeometry(radius * 0.98, radius, 64);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  floor.add(m);
}
makeRing(12, 0x00ffff);
makeRing(18, 0xff00ff);

// Board constants
const BOARD_SIZE = 8;
const TILE_SIZE = 1.2; // world units per square
const BOARD_THICKNESS = 0.4;
const BOARD_RADIUS = 0.25; // rounded corners base

const boardGroup = new THREE.Group();
scene.add(boardGroup);

// Board base rounded
const base = new THREE.Mesh(
  new RoundedBoxGeometry(BOARD_SIZE * TILE_SIZE + 1.0, BOARD_THICKNESS, BOARD_SIZE * TILE_SIZE + 1.0, 2, BOARD_RADIUS),
  new THREE.MeshPhysicalMaterial({
    color: 0x0d1017,
    metalness: 0.8,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    sheen: 0.5,
    sheenRoughness: 0.6,
    side: THREE.DoubleSide,
  })
);
base.position.y = BOARD_THICKNESS / 2;
base.castShadow = true;
base.receiveShadow = true;
boardGroup.add(base);

// Inset glow strip around top face
const inset = new THREE.Mesh(
  new RoundedBoxGeometry(BOARD_SIZE * TILE_SIZE + 0.9, 0.02, BOARD_SIZE * TILE_SIZE + 0.9, 1, 0.2),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.12 })
);
inset.position.y = BOARD_THICKNESS + 0.001;
boardGroup.add(inset);

// Coordinates helpers
const files = ["a","b","c","d","e","f","g","h"];
function algebraicToCoord(square) {
  const file = files.indexOf(square[0]);
  const rank = parseInt(square[1], 10) - 1;
  return { file, rank };
}
function coordToAlgebraic(file, rank) {
  return files[file] + (rank + 1);
}
function squareToPosition(square) {
  const { file, rank } = algebraicToCoord(square);
  const x = (file - 3.5) * TILE_SIZE;
  const z = (rank - 3.5) * TILE_SIZE;
  return new THREE.Vector3(x, BOARD_THICKNESS + 0.001, z);
}

// Tiles instanced (alternating colors)
const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.06, TILE_SIZE * 0.98);
const tileMatLight = new THREE.MeshStandardMaterial({ color: 0x121826, metalness: 0.5, roughness: 0.5, emissive: 0x06171a, emissiveIntensity: 0.35 });
const tileMatDark = new THREE.MeshStandardMaterial({ color: 0x0a0f1b, metalness: 0.6, roughness: 0.5, emissive: 0x14061a, emissiveIntensity: 0.35 });

const tiles = new THREE.InstancedMesh(tileGeo, tileMatLight, BOARD_SIZE * BOARD_SIZE);
tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
boardGroup.add(tiles);

const dummy = new THREE.Object3D();
let idx = 0;
for (let r = 0; r < 8; r++) {
  for (let f = 0; f < 8; f++) {
    const x = (f - 3.5) * TILE_SIZE;
    const z = (r - 3.5) * TILE_SIZE;
    dummy.position.set(x, BOARD_THICKNESS + 0.03, z);
    dummy.updateMatrix();
    tiles.setMatrixAt(idx, dummy.matrix);
    // color per tile
    const isDark = (f + r) % 2 === 0;
    const c = new THREE.Color(isDark ? 0x0b0f19 : 0x121826);
    tiles.setColorAt(idx, c);
    idx++;
  }
}
tiles.instanceColor.needsUpdate = true;

// Tile outline glow for hover/selection
const highlightRingGeo = new THREE.RingGeometry(TILE_SIZE * 0.35, TILE_SIZE * 0.45, 48);
const highlightRingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
const highlightRing = new THREE.Mesh(highlightRingGeo, highlightRingMat);
highlightRing.rotation.x = -Math.PI / 2;
highlightRing.visible = false;
boardGroup.add(highlightRing);

// Move targets (pool)
const targetGeo = new THREE.RingGeometry(TILE_SIZE * 0.15, TILE_SIZE * 0.28, 32);
const targetMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
const captureMat = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
const targetPool = [];
function getTargetMesh() {
  const m = targetPool.pop() || new THREE.Mesh(targetGeo, targetMat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = BOARD_THICKNESS + 0.04;
  m.visible = true;
  boardGroup.add(m);
  return m;
}
function recycleTargets() {
  for (const m of currentTargets) {
    m.visible = false;
    boardGroup.remove(m);
    targetPool.push(m);
  }
  currentTargets.length = 0;
}

// Unique stylized piece geometry builders
const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, metalness: 0.5, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.15, emissive: 0x66ffff, emissiveIntensity: 0.05 });
const blackMat = new THREE.MeshPhysicalMaterial({ color: 0x1a2230, metalness: 0.8, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25, emissive: 0x9e1aff, emissiveIntensity: 0.04 });

function makeBase() {
  const g = new RoundedBoxGeometry(0.9, 0.18, 0.9, 1, 0.08);
  g.translate(0, 0.09, 0);
  return g;
}

function makePawn() {
  const g = new THREE.BufferGeometry();
  const base = makeBase();
  const cyl = new THREE.CylinderGeometry(0.18, 0.28, 0.5, 24);
  cyl.translate(0, 0.35, 0);
  const head = new THREE.SphereGeometry(0.24, 24, 16);
  head.translate(0, 0.8, 0);
  g.copy(THREE.BufferGeometryUtils.mergeGeometries([base, cyl, head]));
  return g;
}

function stackCylinders(levels) {
  const parts = [];
  let y = 0;
  for (const [rTop, rBottom, h] of levels) {
    const c = new THREE.CylinderGeometry(rTop, rBottom, h, 32);
    y += h / 2;
    c.translate(0, y, 0);
    y += h / 2;
    parts.push(c);
  }
  return { geo: parts, totalH: y };
}

function makeRook() {
  const base = makeBase();
  const { geo } = stackCylinders([
    [0.45, 0.55, 0.2],
    [0.35, 0.45, 0.3],
    [0.35, 0.35, 0.4],
  ]);
  const top = new THREE.TorusGeometry(0.32, 0.06, 12, 24);
  top.rotateX(Math.PI / 2);
  top.translate(0, 0.95, 0);
  const g = new THREE.BufferGeometry();
  g.copy(THREE.BufferGeometryUtils.mergeGeometries([base, ...geo, top]));
  return g;
}

function makeBishop() {
  const base = makeBase();
  const { geo } = stackCylinders([
    [0.4, 0.55, 0.18],
    [0.3, 0.42, 0.28],
    [0.2, 0.3, 0.3],
  ]);
  const head = new THREE.SphereGeometry(0.28, 24, 16);
  head.translate(0, 0.9, 0);
  const halo = new THREE.TorusGeometry(0.22, 0.03, 10, 24);
  halo.rotateX(Math.PI / 2);
  halo.translate(0, 0.86, 0);
  const g = new THREE.BufferGeometry();
  g.copy(THREE.BufferGeometryUtils.mergeGeometries([base, ...geo, head, halo]));
  return g;
}

function makeKnight() {
  // Abstract knight: angled prism + sphere cap -> futuristic look
  const base = makeBase();
  const prism = new RoundedBoxGeometry(0.42, 0.7, 0.3, 1, 0.08);
  prism.rotateZ(-0.35);
  prism.translate(0.05, 0.6, 0);
  const cap = new THREE.SphereGeometry(0.22, 24, 16);
  cap.translate(0.26, 0.95, 0);
  const g = new THREE.BufferGeometry();
  g.copy(THREE.BufferGeometryUtils.mergeGeometries([base, prism, cap]));
  return g;
}

function makeQueen() {
  const base = makeBase();
  const { geo } = stackCylinders([
    [0.5, 0.6, 0.2],
    [0.38, 0.5, 0.35],
    [0.28, 0.36, 0.35],
  ]);
  const crown = new THREE.TorusGeometry(0.3, 0.05, 14, 28);
  crown.rotateX(Math.PI / 2);
  crown.translate(0, 1.1, 0);
  const jewel = new THREE.IcosahedronGeometry(0.12, 0);
  jewel.translate(0, 1.26, 0);
  const g = new THREE.BufferGeometry();
  g.copy(THREE.BufferGeometryUtils.mergeGeometries([base, ...geo, crown, jewel]));
  return g;
}

function makeKing() {
  const base = makeBase();
  const { geo } = stackCylinders([
    [0.5, 0.62, 0.22],
    [0.4, 0.5, 0.38],
    [0.3, 0.36, 0.38],
  ]);
  const head = new THREE.SphereGeometry(0.24, 24, 16);
  head.translate(0, 1.1, 0);
  const crossV = new THREE.BoxGeometry(0.08, 0.34, 0.08);
  crossV.translate(0, 1.36, 0);
  const crossH = new THREE.BoxGeometry(0.28, 0.08, 0.08);
  crossH.translate(0, 1.36, 0);
  const g = new THREE.BufferGeometry();
  g.copy(THREE.BufferGeometryUtils.mergeGeometries([base, ...geo, head, crossV, crossH]));
  return g;
}

// BufferGeometryUtils dependency (mergeGeometries)
// Inline import via module - keep inside same file
import * as BufferGeometryUtils from "https://unpkg.com/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js";
THREE.BufferGeometryUtils = BufferGeometryUtils;

// Materials per color
function matForColor(color) { return color === 'w' ? whiteMat : blackMat; }

// Build piece mesh by type
function buildPieceMesh(type, color) {
  let geoFn = {
    p: makePawn,
    r: makeRook,
    n: makeKnight,
    b: makeBishop,
    q: makeQueen,
    k: makeKing,
  }[type];
  const geo = geoFn();
  const mat = matForColor(color);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.scale.setScalar(0.95);
  return mesh;
}

// Initial placement
const piecesGroup = new THREE.Group();
boardGroup.add(piecesGroup);

function placeInitialPieces() {
  // Clear existing
  while (piecesGroup.children.length) piecesGroup.remove(piecesGroup.children[0]);

  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const square = coordToAlgebraic(f, r);
      const mesh = buildPieceMesh(cell.type, cell.color);
      const pos = squareToPosition(square);
      mesh.position.copy(pos);
      mesh.position.y += 0.25;
      mesh.userData.square = square;
      mesh.userData.type = cell.type;
      mesh.userData.color = cell.color;
      piecesGroup.add(mesh);
    }
  }
}

placeInitialPieces();
updateTurnLabel();

// Raycasting & interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredTile = null;
let selectedPiece = null;
let currentTargets = [];
let legalMoves = [];
let dragging = false;
let dragOffsetY = 0;

function updateMouse(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function raycastBoard(e) {
  updateMouse(e);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(tiles, true);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    const f = Math.round(point.x / TILE_SIZE + 3.5);
    const r = Math.round(point.z / TILE_SIZE + 3.5);
    if (f >= 0 && f < 8 && r >= 0 && r < 8) {
      return { file: f, rank: r, square: coordToAlgebraic(f, r) };
    }
  }
  return null;
}

function showHighlight(square) {
  const pos = squareToPosition(square);
  highlightRing.position.set(pos.x, BOARD_THICKNESS + 0.041, pos.z);
  highlightRing.visible = true;
}

function hideHighlight() { highlightRing.visible = false; }

function showTargets(moves) {
  recycleTargets();
  for (const m of moves) {
    const ring = getTargetMesh();
    ring.material = m.captured ? captureMat : targetMat;
    const pos = squareToPosition(m.to);
    ring.position.set(pos.x, BOARD_THICKNESS + 0.041, pos.z);
    ring.userData.move = m;
    currentTargets.push(ring);
  }
}

function pieceAtSquare(square) {
  for (const c of piecesGroup.children) {
    if (c.userData.square === square) return c;
  }
  return null;
}

function removePieceMesh(mesh) {
  mesh.parent && mesh.parent.remove(mesh);
}

function syncPiecesFromGame() {
  // Remove missing
  const existing = new Map();
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const square = coordToAlgebraic(f, r);
      const logical = board[r][f];
      const mesh = pieceAtSquare(square);
      if (logical && mesh) {
        // same square OK
        existing.set(square, true);
      } else if (logical && !mesh) {
        // need to add
        const newMesh = buildPieceMesh(logical.type, logical.color);
        const pos = squareToPosition(square);
        newMesh.position.copy(pos);
        newMesh.position.y += 0.25;
        newMesh.userData.square = square;
        newMesh.userData.type = logical.type;
        newMesh.userData.color = logical.color;
        piecesGroup.add(newMesh);
      } else if (!logical && mesh) {
        removePieceMesh(mesh);
      }
    }
  }
  // Update all positions to snap
  for (const c of piecesGroup.children) {
    const pos = squareToPosition(c.userData.square);
    c.position.x = pos.x;
    c.position.z = pos.z;
    c.position.y = 0.25 + BOARD_THICKNESS;
  }
}

function updateTurnLabel() {
  const turn = game.turn() === 'w' ? 'Putih' : 'Hitam';
  turnEl.textContent = `Giliran: ${turn}`;
  statusEl.textContent = game.in_checkmate() ? 'Skakmat!' : game.in_check() ? 'Skak!' : game.in_draw() ? 'Seri' : '';
}

function onPointerMove(e) {
  const info = raycastBoard(e);
  if (info) {
    hoveredTile = info.square;
    if (!dragging) showHighlight(info.square);
  } else {
    hoveredTile = null;
    hideHighlight();
  }
  if (dragging && selectedPiece) {
    // Follow pointer
    updateMouse(e);
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), - (BOARD_THICKNESS + 0.25));
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, hit);
    selectedPiece.position.x = hit.x;
    selectedPiece.position.z = hit.z;
    selectedPiece.position.y = BOARD_THICKNESS + 0.55;
  }
}

function onPointerDown(e) {
  updateMouse(e);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(piecesGroup.children, true);
  if (intersects.length > 0) {
    let mesh = intersects[0].object;
    while (mesh && !mesh.userData.square && mesh.parent) mesh = mesh.parent;
    if (!mesh) return;
    // Only current turn color
    const turnColor = game.turn();
    if (mesh.userData.color !== turnColor) return;
    selectedPiece = mesh;
    dragging = true;
    const square = mesh.userData.square;
    const moves = game.moves({ square, verbose: true });
    legalMoves = moves;
    showTargets(moves);
    showHighlight(square);
  }
}

function onPointerUp(e) {
  if (!dragging || !selectedPiece) return cancelDrag();
  const info = raycastBoard(e);
  let moveApplied = false;
  if (info) {
    const from = selectedPiece.userData.square;
    const to = info.square;
    // find matching move
    let move = legalMoves.find(m => m.to === to);
    if (move && move.flags.includes('p')) {
      // promotion, default to queen unless UI overrides quickly
      move.promotion = 'q';
    }
    if (move) {
      const res = game.move(move);
      if (res) moveApplied = true;
    }
  }
  // Sync and cleanup
  syncPiecesFromGame();
  updateTurnLabel();
  cancelDrag();
}

function cancelDrag() {
  dragging = false;
  selectedPiece = null;
  legalMoves = [];
  recycleTargets();
  hideHighlight();
}

// Click on move targets directly
function onClick(e) {
  updateMouse(e);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(currentTargets, true);
  if (intersects.length > 0 && selectedPiece) {
    const ring = intersects[0].object;
    const move = ring.userData.move;
    if (move.flags.includes('p')) move.promotion = 'q';
    const res = game.move(move);
    if (res) {
      syncPiecesFromGame();
      updateTurnLabel();
      cancelDrag();
    }
  }
}

renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('click', onClick);

resetBtn.addEventListener('click', () => {
  game.reset();
  placeInitialPieces();
  updateTurnLabel();
});

// Animate subtle floating of pieces
let t = 0;
function animate() {
  t += 0.01;
  for (const c of piecesGroup.children) {
    const baseY = BOARD_THICKNESS + 0.25;
    c.position.y = baseY + Math.sin((c.position.x + c.position.z) * 0.2 + t) * 0.015;
  }
  controls.update();
  composer.render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});