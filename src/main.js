import * as THREE from "three";
import * as CANNON from "cannon-es";

import "./style.css";

const canvas = document.querySelector("#game");
const levelCount = document.querySelector("#levelCount");
const goalLabel = document.querySelector("#goalLabel");
const starCount = document.querySelector("#starCount");
const enemyCount = document.querySelector("#enemyCount");
const goldCount = document.querySelector("#goldCount");
const weaponCount = document.querySelector("#weaponCount");
const timeCount = document.querySelector("#timeCount");
const message = document.querySelector("#message");
const miniMap = document.querySelector("#miniMap");
const palettePanel = document.querySelector(".palettePanel");
const movePad = document.querySelector("#movePad");
const joystickKnob = document.querySelector("#joystickKnob");
const buildButton = document.querySelector("#buildButton");
const boxButton = document.querySelector("#boxButton");
const attackButton = document.querySelector("#attackButton");
const weaponButton = document.querySelector("#weaponButton");
const jumpButton = document.querySelector("#jumpButton");
const removeButton = document.querySelector("#removeButton");
const helpButton = document.querySelector("#helpButton");
const avatarButton = document.querySelector("#avatarButton");
const shopButton = document.querySelector("#shopButton");
const installButton = document.querySelector("#installButton");
const shopPanel = document.querySelector("#shopPanel");
const shopList = document.querySelector("#shopList");
const closeShopButton = document.querySelector("#closeShopButton");
const avatarPanel = document.querySelector("#avatarPanel");
const avatarEditor = document.querySelector("#avatarEditor");
const closeAvatarButton = document.querySelector("#closeAvatarButton");
const helpPanel = document.querySelector("#helpPanel");
const closeHelpButton = document.querySelector("#closeHelpButton");
const controlCoach = document.querySelector("#controlCoach");
const hideCoachButton = document.querySelector("#hideCoachButton");
const winPanel = document.querySelector("#winPanel");
const finalSummary = document.querySelector("#finalSummary");
const clearTime = document.querySelector("#clearTime");
const clearReward = document.querySelector("#clearReward");
const restartButton = document.querySelector("#restartButton");

const SAVE_KEY = "hyuni-rainbow-easy-save-v1";
const WORLD_LIMIT = 28;
const WORLD_RENDER_SIZE = WORLD_LIMIT * 2 + 10;
const BLOCK_SIZE = 1;
const PLAYER_RADIUS = 0.45;
const FIXED_STEP = 1 / 60;
const ATTACK_RANGE = 3.75;
const ATTACK_COOLDOWN = 0.42;
const HIT_COOLDOWN = 0.84;
const COLLECT_RADIUS = 1.7;

const WEAPONS = {
  push: {
    label: "밀치기",
    button: "밀치기",
    symbol: "⚡",
    cooldown: 0.42
  },
  bow: {
    label: "활",
    button: "활",
    symbol: "➶",
    cooldown: 0.56
  },
  fireball: {
    label: "파이어볼",
    button: "불공",
    symbol: "●",
    cooldown: 0.72
  }
};
const WEAPON_ORDER = ["push", "bow", "fireball"];
const BOW_MAX_CHARGE = 1.25;
const BOW_MIN_POWER = 0.28;
const BOX_NOISE_LIMIT = 1.35;
const TREE_BUMP_COOLDOWN = 2.4;

const LEVELS = [
  {
    name: "블록 찾기",
    goalLabel: "블록",
    goal: 6,
    activeFriends: ["파랑"],
    intro: "1단계: 블록을 가까이서 모으고 파랑을 막아요"
  },
  {
    name: "음식 넣기",
    goalLabel: "음식",
    goal: 8,
    activeFriends: ["파랑", "초록"],
    intro: "2단계: 활과 화살을 얻고 초록의 소리를 피하세요"
  },
  {
    name: "퓨즈 켜기",
    goalLabel: "퓨즈",
    goal: 10,
    activeFriends: ["파랑", "초록", "주황", "보라", "노랑"],
    intro: "3단계: 파이어볼로 주황 돌진과 노랑 낚아채기를 막아요"
  },
  {
    name: "배터리 탈출",
    goalLabel: "배터리",
    goal: 12,
    activeFriends: ["파랑", "초록", "주황", "보라", "노랑", "청록"],
    intro: "4단계: 미니맵을 보며 모든 친구를 넘고 탈출해요"
  }
];

const palette = [
  { name: "민트", color: 0x49c6a5, css: "#49c6a5", cost: 0 },
  { name: "노랑", color: 0xffd166, css: "#ffd166", cost: 0 },
  { name: "코랄", color: 0xf97068, css: "#f97068", cost: 0 },
  { name: "하늘", color: 0x5db7de, css: "#5db7de", cost: 0 },
  { name: "라임", color: 0xa7c957, css: "#a7c957", cost: 10 },
  { name: "분홍", color: 0xff8fab, css: "#ff8fab", cost: 12 },
  { name: "보라", color: 0x8d7bff, css: "#8d7bff", cost: 12 },
  { name: "밤하늘", color: 0x3d5a80, css: "#3d5a80", cost: 14 }
];

function readSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
  } catch {
    return {};
  }
}

const save = readSave();
let gold = Number.isFinite(save.gold) ? save.gold : 0;
const purchased = new Set(Array.isArray(save.purchased) ? save.purchased : []);
const unlockedColors = new Set(
  palette
    .map((item, index) => (item.cost === 0 ? index : null))
    .filter((index) => index !== null)
);

if (Array.isArray(save.colors)) {
  save.colors.forEach((index) => {
    if (Number.isInteger(index) && palette[index]) unlockedColors.add(index);
  });
}

const avatarDefaults = {
  skin: "warm",
  shirt: "blue",
  pants: "navy",
  hair: "brown",
  hairStyle: "soft",
  accessory: "glow"
};

const avatarOptions = {
  skin: [
    { id: "warm", label: "복숭아", color: 0xffd6a5, css: "#ffd6a5" },
    { id: "honey", label: "꿀빛", color: 0xe8ad75, css: "#e8ad75" },
    { id: "rose", label: "장밋빛", color: 0xf2b8a2, css: "#f2b8a2" }
  ],
  shirt: [
    { id: "blue", label: "하늘 후디", color: 0x4f8cf7, css: "#4f8cf7" },
    { id: "mint", label: "민트 후디", color: 0x49c6a5, css: "#49c6a5" },
    { id: "coral", label: "코랄 후디", color: 0xf97068, css: "#f97068" },
    { id: "violet", label: "보라 후디", color: 0x8d7bff, css: "#8d7bff" }
  ],
  pants: [
    { id: "navy", label: "남색 바지", color: 0x243447, css: "#243447" },
    { id: "charcoal", label: "먹색 바지", color: 0x3f4752, css: "#3f4752" },
    { id: "olive", label: "초록 바지", color: 0x566b42, css: "#566b42" }
  ],
  hair: [
    { id: "brown", label: "초코", color: 0x3b2f2f, css: "#3b2f2f" },
    { id: "black", label: "검정", color: 0x141414, css: "#141414" },
    { id: "caramel", label: "카라멜", color: 0xa0603a, css: "#a0603a" }
  ],
  hairStyle: [
    { id: "soft", label: "동글 앞머리" },
    { id: "fluffy", label: "푹신 머리" },
    { id: "cap", label: "별 모자" }
  ],
  accessory: [
    { id: "glow", label: "반짝 링" },
    { id: "star", label: "별 핀" },
    { id: "badge", label: "용감 배지" },
    { id: "none", label: "없음" }
  ]
};

let avatarAppearance = { ...avatarDefaults, ...(save.avatar || {}) };

function optionValue(group, id = avatarAppearance[group]) {
  return avatarOptions[group].find((item) => item.id === id) || avatarOptions[group][0];
}

let selectedColor = unlockedColors.has(save.selectedColor) ? save.selectedColor : 0;
let lights = 0;
let placedBlocks = 0;
let currentLevelIndex = 0;
let enemiesDefeated = 0;
let won = false;
let levelPortalOpen = false;
let currentWeapon = "push";
let isBoxed = false;
let showMessageTimer = 0;
let elapsed = 0;
let trailTimer = 0;
let attackCooldown = 0;
let playerHitCooldown = 0;
let speedBurstTimer = 0;
let boxMotionNoise = 0;
let bowCharging = false;
let bowChargeStart = 0;
let bowChargePower = 0;
const projectiles = [];
const weaponPickups = [];
const bugs = [];

const upgrades = {
  rainbowTrail: purchased.has("rainbowTrail"),
  speedBoost: purchased.has("speedBoost"),
  rainbowBox: purchased.has("rainbowBox"),
  guideBeam: purchased.has("guideBeam"),
  powerGlove: purchased.has("powerGlove"),
  steadySoles: purchased.has("steadySoles"),
  mapScanner: purchased.has("mapScanner")
};

const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  moveX: 0,
  moveY: 0,
  jump: false
};

let audioContext = null;
let soundReady = false;

function initAudio() {
  if (soundReady) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  audioContext = audioContext || new AudioEngine();
  audioContext.resume?.();
  soundReady = true;
}

function playTone(frequency, duration, type = "sine", volume = 0.08, delay = 0) {
  if (!soundReady || !audioContext) return;
  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playNoise(duration = 0.12, volume = 0.05) {
  if (!soundReady || !audioContext) return;
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain).connect(audioContext.destination);
  source.start();
}

function playSound(name) {
  if (!soundReady) return;
  if (name === "collect") {
    playTone(660, 0.08, "triangle", 0.07);
    playTone(990, 0.1, "triangle", 0.06, 0.07);
  }
  if (name === "attack") {
    playTone(220, 0.08, "sawtooth", 0.055);
    playTone(420, 0.12, "square", 0.035, 0.035);
  }
  if (name === "hit") {
    playNoise(0.16, 0.08);
    playTone(120, 0.16, "sawtooth", 0.05);
  }
  if (name === "bump") {
    playNoise(0.08, 0.035);
    playTone(150, 0.07, "triangle", 0.035);
  }
  if (name === "jump") playTone(420, 0.13, "triangle", 0.055);
  if (name === "monster") playTone(96, 0.18, "sawtooth", 0.06);
  if (name === "clear") {
    [523, 659, 784, 1046].forEach((frequency, index) =>
      playTone(frequency, 0.18, "triangle", 0.065, index * 0.08)
    );
  }
  if (name === "shop") {
    playTone(740, 0.07, "triangle", 0.05);
    playTone(980, 0.08, "triangle", 0.045, 0.06);
  }
}

function saveGame() {
  const data = {
    gold,
    purchased: Array.from(purchased),
    colors: Array.from(unlockedColors),
    selectedColor,
    avatar: avatarAppearance
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function updateGold() {
  goldCount.textContent = `${gold}`;
}

function addGold(amount) {
  gold += amount;
  updateGold();
  saveGame();
  renderShop();
}

function spendGold(amount) {
  if (gold < amount) return false;
  gold -= amount;
  updateGold();
  saveGame();
  renderShop();
  return true;
}

const scene = new THREE.Scene();
const NIGHT_COLOR = 0x050b1f;
scene.background = new THREE.Color(NIGHT_COLOR);
scene.fog = new THREE.Fog(NIGHT_COLOR, 11, 44);

const camera = new THREE.PerspectiveCamera(
  64,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const miniMapContext = miniMap?.getContext("2d");

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -18, 0)
});
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.solver.iterations = 10;
world.solver.tolerance = 0.001;

const groundMaterial = new CANNON.Material("ground");
const playerMaterial = new CANNON.Material("player");
world.defaultContactMaterial.friction = 0.18;
world.defaultContactMaterial.restitution = 0.02;
world.addContactMaterial(
  new CANNON.ContactMaterial(groundMaterial, playerMaterial, {
    friction: 0.05,
    restitution: 0
  })
);

const ambient = new THREE.HemisphereLight(0x8aa6ff, 0x142314, 0.42);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xb8c8ff, 1.05);
sun.position.set(-6, 13, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 42;
scene.add(sun);

function makeSkyTexture() {
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 512;
  skyCanvas.height = 512;
  const context = skyCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, skyCanvas.height);
  gradient.addColorStop(0, "#010414");
  gradient.addColorStop(0.42, "#07163a");
  gradient.addColorStop(0.72, "#0b2745");
  gradient.addColorStop(1, "#10271f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

  context.save();
  context.translate(skyCanvas.width * 0.5, skyCanvas.height * 0.38);
  context.rotate(-0.52);
  const band = context.createLinearGradient(-260, 0, 260, 0);
  band.addColorStop(0, "rgba(62,112,255,0)");
  band.addColorStop(0.22, "rgba(55,145,255,0.18)");
  band.addColorStop(0.48, "rgba(174,218,255,0.32)");
  band.addColorStop(0.7, "rgba(68,194,226,0.18)");
  band.addColorStop(1, "rgba(62,112,255,0)");
  context.fillStyle = band;
  context.beginPath();
  context.ellipse(0, 0, 310, 46, 0, 0, Math.PI * 2);
  context.fill();
  for (let i = 0; i < 95; i += 1) {
    const x = -250 + Math.random() * 500;
    const y = (Math.random() - 0.5) * 72;
    const alpha = 0.12 + Math.random() * 0.28;
    context.fillStyle = `rgba(185,225,255,${alpha})`;
    context.fillRect(x, y, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
  }
  context.restore();

  for (let i = 0; i < 9; i += 1) {
    const x = 80 + Math.random() * 360;
    const y = 60 + Math.random() * 190;
    const radius = 70 + Math.random() * 90;
    const cloud = context.createRadialGradient(x, y, 8, x, y, radius);
    cloud.addColorStop(0, "rgba(71,167,255,0.12)");
    cloud.addColorStop(0.46, "rgba(32,199,184,0.07)");
    cloud.addColorStop(1, "rgba(71,167,255,0)");
    context.fillStyle = cloud;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * skyCanvas.width;
    const y = Math.random() * skyCanvas.height * 0.68;
    const radius = Math.random() * 1.5 + 0.2;
    context.fillStyle = `rgba(216,238,255,${0.26 + Math.random() * 0.6})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(skyCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlowTexture() {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const context = glowCanvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, "rgba(224,235,255,0.7)");
  gradient.addColorStop(0.35, "rgba(153,183,255,0.22)");
  gradient.addColorStop(1, "rgba(153,183,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(glowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(86, 36, 18),
  new THREE.MeshBasicMaterial({
    map: makeSkyTexture(),
    side: THREE.BackSide,
    fog: false
  })
);
scene.add(skyDome);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(1.05, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xd8e1ff })
);
moon.position.set(-9, 14, -12);
scene.add(moon);

const moonGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xd8e9ff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    fog: false
  })
);
moonGlow.position.copy(moon.position);
moonGlow.scale.set(7.5, 7.5, 1);
scene.add(moonGlow);

const stars = new THREE.Group();
const starDotGeometry = new THREE.SphereGeometry(0.035, 6, 4);
const starDotMaterial = new THREE.MeshBasicMaterial({ color: 0xd8e9ff });
for (let i = 0; i < 70; i += 1) {
  const dot = new THREE.Mesh(starDotGeometry, starDotMaterial);
  const angle = Math.random() * Math.PI * 2;
  const radius = 16 + Math.random() * 16;
  dot.position.set(
    Math.cos(angle) * radius,
    9 + Math.random() * 13,
    Math.sin(angle) * radius
  );
  stars.add(dot);
}
scene.add(stars);

const fireflies = [];

const playerLantern = new THREE.PointLight(0xffdf9c, 6.2, 8.5, 1.4);
playerLantern.castShadow = false;
scene.add(playerLantern);

const flashlight = new THREE.SpotLight(0xdfe9ff, 5.5, 16, Math.PI / 5.6, 0.58, 1.3);
flashlight.castShadow = false;
const flashlightTarget = new THREE.Object3D();
scene.add(flashlight, flashlightTarget);
flashlight.target = flashlightTarget;

function makeGroundTexture() {
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = 256;
  groundCanvas.height = 256;
  const context = groundCanvas.getContext("2d");
  context.fillStyle = "#2e5540";
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 820; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const length = 6 + Math.random() * 16;
    context.strokeStyle = Math.random() > 0.5 ? "rgba(73,198,165,0.13)" : "rgba(18,42,34,0.18)";
    context.lineWidth = Math.random() * 1.8 + 0.35;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(i) * length, y + Math.sin(i * 1.7) * length * 0.35);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(groundCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 14);
  return texture;
}

const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_RENDER_SIZE, WORLD_RENDER_SIZE),
  new THREE.MeshStandardMaterial({
    color: 0x2e5540,
    map: makeGroundTexture(),
    roughness: 0.86,
    metalness: 0.02
  })
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const grid = new THREE.GridHelper(WORLD_RENDER_SIZE, WORLD_RENDER_SIZE, 0x193f3d, 0x4e7957);
grid.position.y = 0.028;
grid.material.transparent = true;
grid.material.opacity = 0.14;
grid.material.depthWrite = false;
scene.add(grid);

const groundBody = new CANNON.Body({
  mass: 0,
  material: groundMaterial,
  shape: new CANNON.Plane()
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
const blockEdgeGeometry = new THREE.EdgesGeometry(blockGeometry);
const edgeMaterial = new THREE.LineBasicMaterial({
  color: 0x132227,
  transparent: true,
  opacity: 0.16
});
const blockMaterials = palette.map(
  (item) =>
    new THREE.MeshStandardMaterial({
      color: item.color,
      roughness: 0.66,
      metalness: 0.02
    })
);

const blocks = new Map();
const treeCanopies = [];
const treeObstacles = [];

function keyFor(x, y, z) {
  return `${x},${y},${z}`;
}

function parseKey(key) {
  return key.split(",").map(Number);
}

function inWorld(x, z) {
  return Math.abs(x) <= WORLD_LIMIT && Math.abs(z) <= WORLD_LIMIT;
}

function addBlock(x, y, z, colorIndex = selectedColor, locked = false) {
  if (!inWorld(x, z) || y < 0 || y > 7) return false;

  const key = keyFor(x, y, z);
  if (blocks.has(key)) return false;

  const mesh = new THREE.Mesh(blockGeometry, blockMaterials[colorIndex]);
  mesh.position.set(x, y + 0.5, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.LineSegments(blockEdgeGeometry, edgeMaterial);
  mesh.add(edges);
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
  });
  body.position.set(x, y + 0.5, z);
  world.addBody(body);

  blocks.set(key, { mesh, body, colorIndex, locked });
  return true;
}

function removeBlock(x, y, z) {
  const key = keyFor(x, y, z);
  const block = blocks.get(key);
  if (!block || block.locked) return false;

  scene.remove(block.mesh);
  world.removeBody(block.body);
  blocks.delete(key);
  return true;
}

function topBlockY(x, z) {
  let top = -1;
  for (const key of blocks.keys()) {
    const [bx, by, bz] = parseKey(key);
    if (bx === x && bz === z && by > top) top = by;
  }
  return top;
}

function makeTree(x, z, scale = 1) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2 * scale, 0.28 * scale, 1.35 * scale, 7),
    new THREE.MeshStandardMaterial({ color: 0x90603b, roughness: 0.88 })
  );
  trunk.position.set(x, 0.68 * scale, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f9e44,
    roughness: 0.78,
    transparent: true
  });
  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.98 * scale, 0), crownMaterial);
  crown.position.set(x, 1.95 * scale, z);
  crown.castShadow = true;
  scene.add(crown);

  const shadowCrownMaterial = new THREE.MeshStandardMaterial({
    color: 0x256d3a,
    roughness: 0.82,
    transparent: true
  });
  const shadowCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72 * scale, 0), shadowCrownMaterial);
  shadowCrown.position.set(x + 0.28 * scale, 1.55 * scale, z - 0.18 * scale);
  shadowCrown.castShadow = true;
  scene.add(shadowCrown);
  treeCanopies.push(crown, shadowCrown);
  treeObstacles.push({
    x,
    z,
    radius: 0.38 * scale,
    trunk,
    crown,
    shadowCrown,
    baseCrownY: crown.position.y,
    baseShadowY: shadowCrown.position.y,
    nextDropAt: 0,
    bumpUntil: 0,
    phase: Math.random() * Math.PI * 2
  });
}

function makeFence(x, z, width, depth) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.85, depth),
    new THREE.MeshStandardMaterial({ color: 0xf6f0d4, roughness: 0.74 })
  );
  mesh.position.set(x, 0.42, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, 0.42, depth / 2))
  });
  body.position.copy(mesh.position);
  world.addBody(body);
}

function makePath(x, z, width, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.041, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function makeBlockLine(cells, colorIndex = 7) {
  cells.forEach(([x, z, height = 1]) => {
    for (let y = 0; y < height; y += 1) {
      addBlock(x, y, z, colorIndex, true);
    }
  });
}

const safeZones = [];

function makeSafeZone(x, z, radius = 1.65) {
  const group = new THREE.Group();
  const springMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8e9ff,
    metalness: 0.35,
    roughness: 0.38
  });
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x172026,
    roughness: 0.55,
    metalness: 0.18
  });
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.34, 8), legMaterial);
    leg.position.set(Math.cos(angle) * radius * 0.78, 0.18, Math.sin(angle) * radius * 0.78);
    leg.castShadow = true;
    group.add(leg);
  }
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.94, 0.14, 48),
    new THREE.MeshStandardMaterial({
      color: 0x1d2846,
      emissive: 0x102e69,
      emissiveIntensity: 0.32,
      roughness: 0.46
    })
  );
  pad.position.y = 0.24;
  pad.receiveShadow = true;
  pad.castShadow = true;
  group.add(pad);

  const mat = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius * 0.82, 0.045, 48),
    new THREE.MeshStandardMaterial({
      color: 0x49c6a5,
      emissive: 0x20c7b8,
      emissiveIntensity: 0.5,
      roughness: 0.42
    })
  );
  mat.position.y = 0.34;
  mat.receiveShadow = true;
  group.add(mat);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.84, 0.045, 8, 56),
    new THREE.MeshBasicMaterial({ color: 0xe0fff4, transparent: true, opacity: 0.82 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.39;
  group.add(ring);

  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 20), springMaterial);
    spring.position.set(Math.cos(angle) * radius * 0.54, 0.17, Math.sin(angle) * radius * 0.54);
    spring.rotation.x = Math.PI / 2;
    spring.rotation.z = angle;
    group.add(spring);
  }

  const marker = makeNameSprite("트램폴린", "rgba(224,255,244,0.94)");
  marker.scale.set(1.35, 0.42, 1);
  marker.position.y = 1.12;
  group.add(marker);

  group.position.set(x, 0, z);
  scene.add(group);
  safeZones.push({ group, x, z, radius, ring, pad, mat, bounceUntil: 0, nextBounceAt: 0 });
}

function makeLightTower(x = 0, z = 0, scale = 1) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.05, 0.38, 18),
    new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.55 })
  );
  base.position.y = 0.19;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 2.25, 14),
    new THREE.MeshStandardMaterial({ color: 0xf6f0d4, roughness: 0.48 })
  );
  pole.position.y = 1.38;
  pole.castShadow = true;
  group.add(pole);

  const lamp = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.44, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffd166,
      emissiveIntensity: 0.8,
      roughness: 0.35
    })
  );
  lamp.position.y = 2.66;
  lamp.castShadow = true;
  group.add(lamp);

  const glow = new THREE.PointLight(0xffd166, 1.8, 8);
  glow.position.y = 2.7;
  group.add(glow);

  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  scene.add(group);
  return lamp;
}

const lightTowerLamp = makeLightTower();

function makeDistantRidge(angle, distance, height, width, color = 0x0f2630) {
  const ridge = new THREE.Mesh(
    new THREE.ConeGeometry(width, height, 5),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95,
      metalness: 0,
      fog: true
    })
  );
  ridge.position.set(Math.cos(angle) * distance, height / 2 - 0.25, Math.sin(angle) * distance);
  ridge.rotation.y = -angle + Math.PI / 2;
  ridge.receiveShadow = true;
  scene.add(ridge);
}

const fireflyGeometry = new THREE.SphereGeometry(0.055, 6, 4);
const fireflyMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd166,
  transparent: true,
  opacity: 0.82
});

function makeFirefly(x, z, phase = 0) {
  const firefly = new THREE.Mesh(fireflyGeometry, fireflyMaterial.clone());
  firefly.position.set(x, 0.9 + Math.sin(phase) * 0.35, z);
  firefly.userData.baseX = x;
  firefly.userData.baseZ = z;
  firefly.userData.phase = phase;
  scene.add(firefly);
  fireflies.push(firefly);
}

function seedWorld() {
  makePath(0, 0, 4.8, WORLD_RENDER_SIZE - 6, 0x2f7d8d);
  makePath(0, 0, WORLD_RENDER_SIZE - 6, 4.8, 0x8f823f);
  makePath(-16.5, 16.5, 11, 2.4, 0x4a5f84);
  makePath(16.5, -16.5, 11, 2.4, 0x5f4c7d);
  makePath(18, 18, 10, 2.2, 0x326b5b);
  makePath(-19, -17, 10, 2.2, 0x6a5b3a);
  makePath(-22, 2, 9, 2.1, 0x354f72);
  makePath(22, -3, 9, 2.1, 0x2f6654);
  makePath(0, 23, 12, 2, 0x56576f);
  makePath(0, -23, 12, 2, 0x72583c);

  const hills = [
    [-5, 0, -4, 4],
    [-4, 0, -4, 4],
    [-5, 1, -4, 4],
    [4, 0, 5, 1],
    [5, 0, 5, 1],
    [6, 0, 5, 1],
    [6, 1, 5, 1],
    [4, 0, -7, 3],
    [4, 1, -7, 3],
    [5, 0, -7, 3],
    [-8, 0, 6, 2],
    [-8, 1, 6, 2],
    [-8, 2, 6, 2],
    [-18, 0, 14, 4],
    [-18, 1, 14, 4],
    [-17, 0, 14, 4],
    [18, 0, -14, 3],
    [19, 0, -14, 3],
    [19, 1, -14, 3],
    [20, 0, 10, 1],
    [21, 0, 10, 1],
    [-21, 0, -9, 2],
    [-21, 1, -9, 2]
  ];

  hills.forEach(([x, y, z, color]) => addBlock(x, y, z, color, true));

  makeBlockLine(
    [
      [-2, -6, 1],
      [-1, -6, 1],
      [0, -6, 2],
      [1, -6, 1],
      [2, -6, 1],
      [-6, 0, 1],
      [-6, 1, 1],
      [-6, 2, 2],
      [6, -2, 1],
      [6, -1, 1],
      [6, 0, 2],
      [6, 1, 1],
      [-3, 7, 1],
      [-2, 7, 1],
      [2, -9, 1],
      [3, -9, 1],
      [-18, 3, 1],
      [-17, 3, 1],
      [-16, 3, 2],
      [16, -4, 1],
      [17, -4, 1],
      [18, -4, 2],
      [-22, 17, 1],
      [-21, 17, 1],
      [21, -18, 1],
      [22, -18, 1],
      [10, 22, 1],
      [11, 22, 1],
      [-10, -22, 1],
      [-11, -22, 1]
    ],
    7
  );

  makeSafeZone(-12, 11, 1.75);
  makeSafeZone(13, -12, 1.75);
  makeSafeZone(10, 10, 1.65);
  makeSafeZone(-22, 21, 1.85);
  makeSafeZone(22, -22, 1.85);
  makeSafeZone(22, 18, 1.75);
  makeSafeZone(-20, -19, 1.75);

  const fenceOffset = WORLD_LIMIT + 3.4;
  makeFence(0, -fenceOffset, WORLD_RENDER_SIZE - 5, 0.35);
  makeFence(0, fenceOffset, WORLD_RENDER_SIZE - 5, 0.35);
  makeFence(-fenceOffset, 0, 0.35, WORLD_RENDER_SIZE - 5);
  makeFence(fenceOffset, 0, 0.35, WORLD_RENDER_SIZE - 5);

  [
    [-15, -13, 1.65],
    [-15, 5, 1.9],
    [-12, 14, 1.35],
    [-7, 13, 1.25],
    [9, -13, 1.55],
    [15, -8, 1.75],
    [15, 8, 1.6],
    [5, 15, 1.35],
    [-3, -14, 1.45],
    [13, 2, 1.25],
    [-11, -5, 1.4],
    [2, 11, 1.25],
    [-24, -21, 1.9],
    [-24, -7, 1.45],
    [-23, 10, 1.75],
    [-20, 24, 1.55],
    [-8, 24, 1.45],
    [8, 24, 1.55],
    [21, 22, 1.85],
    [24, 8, 1.5],
    [24, -8, 1.72],
    [21, -23, 1.6],
    [6, -24, 1.65],
    [-7, -24, 1.48],
    [16, 15, 1.36],
    [-18, 18, 1.38],
    [18, -18, 1.42],
    [-18, -16, 1.52]
  ].forEach(([x, z, scale]) => makeTree(x, z, scale));

  [
    [-18, 0, 0.82],
    [18, 0, 0.82],
    [0, 18, 0.82],
    [0, -18, 0.82],
    [-22, 21, 0.68],
    [22, -22, 0.68]
  ].forEach(([x, z, scale]) => makeLightTower(x, z, scale));

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const height = 5.5 + Math.sin(i * 1.9) * 1.4 + (i % 3) * 0.7;
    const width = 3.2 + (i % 4) * 0.55;
    makeDistantRidge(angle, WORLD_LIMIT + 8 + (i % 2) * 1.8, height, width, i % 2 ? 0x102836 : 0x0b202a);
  }

  [
    [-9, 12],
    [12, -9],
    [-21, 20],
    [21, -21],
    [18, 17],
    [-19, -17]
  ].forEach(([x, z], clusterIndex) => {
    for (let i = 0; i < 5; i += 1) {
      makeFirefly(
        x + Math.sin(i * 1.7) * 1.35,
        z + Math.cos(i * 1.3) * 1.2,
        clusterIndex * 1.8 + i * 0.7
      );
    }
  });
}

seedWorld();

const playerBody = new CANNON.Body({
  mass: 4,
  material: playerMaterial,
  fixedRotation: true,
  linearDamping: 0.08,
  shape: new CANNON.Sphere(PLAYER_RADIUS)
});
playerBody.position.set(0, 2.2, 5);
world.addBody(playerBody);

const avatar = new THREE.Group();
const avatarParts = [];
const baseAvatarParts = [];
const hairStyleParts = {
  soft: [],
  fluffy: [],
  cap: []
};
const accessoryParts = {
  glow: [],
  star: [],
  badge: []
};
const weaponVisualParts = {
  bow: [],
  fireball: []
};

const avatarMaterials = {
  skin: new THREE.MeshBasicMaterial({ color: optionValue("skin").color }),
  face: new THREE.MeshBasicMaterial({ color: optionValue("skin").color }),
  shirt: new THREE.MeshStandardMaterial({
    color: optionValue("shirt").color,
    emissive: optionValue("shirt").color,
    emissiveIntensity: 0.24,
    roughness: 0.58
  }),
  pants: new THREE.MeshStandardMaterial({
    color: optionValue("pants").color,
    emissive: optionValue("pants").color,
    emissiveIntensity: 0.12,
    roughness: 0.62
  }),
  hair: new THREE.MeshBasicMaterial({ color: optionValue("hair").color }),
  shoe: new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.62 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x111820 }),
  eyeSpark: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  blush: new THREE.MeshBasicMaterial({ color: 0xff8fab }),
  mouth: new THREE.MeshBasicMaterial({ color: 0xe45f72 }),
  trim: new THREE.MeshBasicMaterial({ color: 0xfff6df }),
  bow: new THREE.MeshStandardMaterial({ color: 0x7b4a28, roughness: 0.55 }),
  bowString: new THREE.MeshBasicMaterial({ color: 0xfff6df }),
  arrow: new THREE.MeshStandardMaterial({ color: 0xf6f0d4, roughness: 0.42 }),
  fire: new THREE.MeshBasicMaterial({ color: 0xff7a2f }),
  accessory: new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffc857,
    emissiveIntensity: 0.28,
    roughness: 0.36
  })
};

function addAvatarMesh(mesh, x, y, z, bucket = baseAvatarParts) {
  const part = mesh;
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  avatar.add(part);
  avatarParts.push(part);
  if (bucket) bucket.push(part);
  return part;
}

function addAvatarPart(width, height, depth, material, x, y, z, bucket) {
  return addAvatarMesh(
    new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material),
    x,
    y,
    z,
    bucket
  );
}

function addAvatarSphere(radius, material, x, y, z, bucket, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  return addAvatarMesh(mesh, x, y, z, bucket);
}

addAvatarPart(0.8, 0.74, 0.4, avatarMaterials.shirt, 0, 0.98, 0);
addAvatarPart(0.84, 0.12, 0.43, avatarMaterials.shirt, 0, 1.36, 0.01);
addAvatarPart(0.48, 0.52, 0.035, avatarMaterials.shirt, 0, 0.98, 0.225);
addAvatarPart(0.54, 0.52, 0.54, avatarMaterials.skin, 0, 1.58, 0);
addAvatarPart(0.44, 0.35, 0.018, avatarMaterials.face, 0, 1.52, 0.281);
addAvatarPart(0.035, 0.34, 0.025, avatarMaterials.trim, -0.12, 1.11, 0.252);
addAvatarPart(0.035, 0.34, 0.025, avatarMaterials.trim, 0.12, 1.11, 0.252);
const leftArm = addAvatarPart(0.22, 0.5, 0.24, avatarMaterials.shirt, -0.52, 0.98, 0);
const rightArm = addAvatarPart(0.22, 0.5, 0.24, avatarMaterials.shirt, 0.52, 0.98, 0);
const leftHand = addAvatarPart(0.22, 0.18, 0.24, avatarMaterials.skin, -0.52, 0.62, 0);
const rightHand = addAvatarPart(0.22, 0.18, 0.24, avatarMaterials.skin, 0.52, 0.62, 0);
const baseLimbPose = {
  leftArm: leftArm.position.clone(),
  rightArm: rightArm.position.clone(),
  leftHand: leftHand.position.clone(),
  rightHand: rightHand.position.clone()
};
const leftLeg = addAvatarPart(0.25, 0.58, 0.28, avatarMaterials.pants, -0.22, 0.32, 0);
const rightLeg = addAvatarPart(0.25, 0.58, 0.28, avatarMaterials.pants, 0.22, 0.32, 0);
addAvatarPart(0.29, 0.12, 0.38, avatarMaterials.shoe, -0.22, 0.02, 0.05);
addAvatarPart(0.29, 0.12, 0.38, avatarMaterials.shoe, 0.22, 0.02, 0.05);

addAvatarSphere(0.043, avatarMaterials.eye, -0.12, 1.62, 0.275);
addAvatarSphere(0.043, avatarMaterials.eye, 0.12, 1.62, 0.275);
addAvatarSphere(0.012, avatarMaterials.eyeSpark, -0.105, 1.635, 0.312);
addAvatarSphere(0.012, avatarMaterials.eyeSpark, 0.135, 1.635, 0.312);
addAvatarSphere(0.035, avatarMaterials.blush, -0.22, 1.5, 0.276, baseAvatarParts, [1.45, 0.62, 0.24]);
addAvatarSphere(0.035, avatarMaterials.blush, 0.22, 1.5, 0.276, baseAvatarParts, [1.45, 0.62, 0.24]);
addAvatarPart(0.13, 0.026, 0.018, avatarMaterials.mouth, 0, 1.46, 0.304);

addAvatarPart(0.58, 0.14, 0.58, avatarMaterials.hair, 0, 1.9, 0, hairStyleParts.soft);
addAvatarPart(0.46, 0.1, 0.08, avatarMaterials.hair, 0, 1.82, 0.26, hairStyleParts.soft);
addAvatarPart(0.12, 0.1, 0.08, avatarMaterials.hair, -0.14, 1.75, 0.28, hairStyleParts.soft);
addAvatarPart(0.12, 0.1, 0.08, avatarMaterials.hair, 0.14, 1.75, 0.28, hairStyleParts.soft);
addAvatarPart(0.5, 0.16, 0.12, avatarMaterials.hair, 0, 1.8, -0.28, hairStyleParts.soft);

addAvatarPart(0.62, 0.18, 0.58, avatarMaterials.hair, 0, 1.9, 0, hairStyleParts.fluffy);
addAvatarPart(0.22, 0.22, 0.22, avatarMaterials.hair, -0.28, 1.92, -0.03, hairStyleParts.fluffy);
addAvatarPart(0.22, 0.22, 0.22, avatarMaterials.hair, 0.28, 1.92, -0.03, hairStyleParts.fluffy);
addAvatarPart(0.14, 0.1, 0.1, avatarMaterials.hair, -0.2, 1.76, 0.28, hairStyleParts.fluffy);
addAvatarPart(0.14, 0.1, 0.1, avatarMaterials.hair, 0, 1.74, 0.29, hairStyleParts.fluffy);
addAvatarPart(0.14, 0.1, 0.1, avatarMaterials.hair, 0.2, 1.76, 0.28, hairStyleParts.fluffy);

addAvatarPart(0.6, 0.18, 0.6, avatarMaterials.hair, 0, 1.88, 0, hairStyleParts.cap);
addAvatarPart(0.52, 0.11, 0.2, avatarMaterials.hair, 0, 1.8, 0.32, hairStyleParts.cap);
addAvatarPart(0.28, 0.06, 0.34, avatarMaterials.shirt, 0, 1.79, 0.47, hairStyleParts.cap);

const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 10, 34), avatarMaterials.accessory);
glowRing.rotation.x = Math.PI / 2;
addAvatarMesh(glowRing, 0, 2.08, 0, accessoryParts.glow);

const starPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), avatarMaterials.accessory);
starPin.rotation.z = Math.PI / 5;
addAvatarMesh(starPin, 0.3, 1.84, 0.28, accessoryParts.star);

const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 18), avatarMaterials.accessory);
badge.rotation.x = Math.PI / 2;
addAvatarMesh(badge, 0.23, 1.1, 0.22, accessoryParts.badge);

const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.58, 12), avatarMaterials.bow);
quiver.rotation.x = -0.32;
quiver.rotation.z = -0.28;
addAvatarMesh(quiver, -0.42, 1.12, -0.32, weaponVisualParts.bow);

[-0.04, 0.04].forEach((offset) => {
  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 6), avatarMaterials.arrow);
  arrow.rotation.x = -0.28;
  arrow.rotation.z = -0.18;
  addAvatarMesh(arrow, -0.43 + offset, 1.38, -0.34, weaponVisualParts.bow);
});

const backBow = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 26, Math.PI), avatarMaterials.bow);
backBow.rotation.set(Math.PI / 2, 0.18, Math.PI / 2);
addAvatarMesh(backBow, 0.42, 1.12, -0.34, weaponVisualParts.bow);

const heldBow = new THREE.Group();
const heldBowArc = new THREE.Mesh(
  new THREE.TorusGeometry(0.36, 0.023, 8, 36, Math.PI),
  avatarMaterials.bow
);
heldBowArc.rotation.set(Math.PI / 2, 0, Math.PI / 2);
heldBow.add(heldBowArc);

const heldBowStringTop = new THREE.Mesh(
  new THREE.CylinderGeometry(0.007, 0.007, 1, 5),
  avatarMaterials.bowString
);
const heldBowStringBottom = heldBowStringTop.clone();
const heldBowArrow = new THREE.Mesh(
  new THREE.CylinderGeometry(0.012, 0.012, 1, 6),
  avatarMaterials.arrow
);
const heldBowArrowTip = new THREE.Mesh(
  new THREE.ConeGeometry(0.055, 0.13, 8),
  new THREE.MeshStandardMaterial({ color: 0x172026, roughness: 0.42 })
);
heldBow.add(heldBowStringTop, heldBowStringBottom, heldBowArrow, heldBowArrowTip);
heldBow.userData = {
  stringTop: heldBowStringTop,
  stringBottom: heldBowStringBottom,
  arrow: heldBowArrow,
  arrowTip: heldBowArrowTip
};
addAvatarMesh(heldBow, -0.34, 1.08, 0.5, weaponVisualParts.bow);

const handFireball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), avatarMaterials.fire);
addAvatarMesh(handFireball, 0.68, 0.8, 0.18, weaponVisualParts.fireball);

function setMaterialColor(material, color) {
  material.color.setHex(color);
  if (material.emissive) material.emissive.setHex(color);
}

function normalizeAvatarAppearance() {
  Object.keys(avatarDefaults).forEach((key) => {
    const option = avatarOptions[key].find((item) => item.id === avatarAppearance[key]);
    avatarAppearance[key] = option ? option.id : avatarDefaults[key];
  });
}

function applyAvatarAppearance(shouldSave = true) {
  normalizeAvatarAppearance();
  setMaterialColor(avatarMaterials.skin, optionValue("skin").color);
  setMaterialColor(avatarMaterials.face, optionValue("skin").color);
  setMaterialColor(avatarMaterials.shirt, optionValue("shirt").color);
  setMaterialColor(avatarMaterials.pants, optionValue("pants").color);
  setMaterialColor(avatarMaterials.hair, optionValue("hair").color);

  const isVisible = !isBoxed;
  baseAvatarParts.forEach((part) => {
    part.visible = isVisible;
  });

  Object.entries(hairStyleParts).forEach(([style, parts]) => {
    parts.forEach((part) => {
      part.visible = isVisible && style === avatarAppearance.hairStyle;
    });
  });

  Object.entries(accessoryParts).forEach(([style, parts]) => {
    parts.forEach((part) => {
      part.visible = isVisible && style === avatarAppearance.accessory;
    });
  });

  Object.entries(weaponVisualParts).forEach(([weapon, parts]) => {
    parts.forEach((part) => {
      part.visible =
        isVisible && (currentWeapon === weapon || (weapon === "bow" && currentWeapon === "fireball"));
    });
  });

  if (shouldSave) saveGame();
}

function makeLabelTexture(text, fill = "rgba(255,255,255,0.92)") {
  const nameCanvas = document.createElement("canvas");
  nameCanvas.width = 256;
  nameCanvas.height = 96;
  const ctx = nameCanvas.getContext("2d");
  ctx.clearRect(0, 0, nameCanvas.width, nameCanvas.height);
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(23,32,38,0.18)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(18, 18, 220, 54, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#172026";
  ctx.font = "900 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 46);

  const texture = new THREE.CanvasTexture(nameCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeNameSprite(text, fill) {
  const material = new THREE.SpriteMaterial({
    map: makeLabelTexture(text, fill),
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.85, 0.7, 1);
  sprite.position.set(0, 2.34, 0);
  return sprite;
}

const playerNameSprite = makeNameSprite("현이", "rgba(255,255,255,0.94)");
playerNameSprite.scale.set(1.28, 0.48, 1);
playerNameSprite.position.set(0, 2.52, 0);
avatar.add(playerNameSprite);

function makeBoxTexture(rainbow = false) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = rainbow ? "#f9f1d2" : "#c58d54";
  ctx.fillRect(0, 0, 256, 256);

  if (rainbow) {
    const colors = ["#f97068", "#ffd166", "#49c6a5", "#5db7de", "#8d7bff"];
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(index * 52 - 8, 0, 36, 256);
    });
  } else {
    ctx.fillStyle = "rgba(91, 55, 25, 0.22)";
    for (let i = 0; i < 8; i += 1) {
      ctx.fillRect(i * 38 - 14, 0, 18, 256);
    }
  }

  ctx.strokeStyle = "rgba(23,32,38,0.35)";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 240);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillRect(54, 94, 148, 54);
  ctx.fillStyle = "#172026";
  ctx.font = "900 30px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("현이", 128, 122);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const boxMaterial = new THREE.MeshStandardMaterial({
  map: makeBoxTexture(upgrades.rainbowBox),
  color: 0xffffff,
  emissive: 0x5b3a1e,
  emissiveIntensity: 0.14,
  roughness: 0.72
});
const boxCover = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.35, 1.16), boxMaterial);
boxCover.position.set(0, 0.78, 0);
boxCover.castShadow = true;
boxCover.receiveShadow = true;
boxCover.visible = false;
avatar.add(boxCover);
scene.add(avatar);

const attackWaveMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff1a8,
  transparent: true,
  opacity: 0,
  depthWrite: false
});
const attackWave = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 34), attackWaveMaterial);
attackWave.scale.set(1, 0.34, 1);
attackWave.visible = false;
scene.add(attackWave);

const pushPalmMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff1a8,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
  side: THREE.DoubleSide
});
const pushPalmGeometry = new THREE.CircleGeometry(0.24, 24);
const leftPushPalm = new THREE.Mesh(pushPalmGeometry, pushPalmMaterial.clone());
const rightPushPalm = new THREE.Mesh(pushPalmGeometry, pushPalmMaterial.clone());
[leftPushPalm, rightPushPalm].forEach((palm) => {
  palm.visible = false;
  palm.renderOrder = 20;
  avatar.add(palm);
});

const lightGeometry = new THREE.IcosahedronGeometry(0.32, 0);
const lightMaterial = new THREE.MeshStandardMaterial({
  color: 0xffcf33,
  emissive: 0xffa600,
  emissiveIntensity: 0.28,
  roughness: 0.36,
  metalness: 0.08
});
const lightsInWorld = [];
const sparkles = [];
const friends = [];

function randomGridCoordinate() {
  const range = WORLD_LIMIT - 4;
  const value = Math.floor(Math.random() * (range * 2 + 1)) - range;
  return Math.abs(value) < 2 ? value + 3 : value;
}

function clearGoalItems() {
  while (lightsInWorld.length > 0) {
    const light = lightsInWorld.pop();
    scene.remove(light);
  }
}

function spawnGoalItem() {
  let x = randomGridCoordinate();
  let z = randomGridCoordinate();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const farFromPlayer =
      Math.hypot(x - playerBody.position.x, z - playerBody.position.z) > 3.2;
    const freeOfLight = lightsInWorld.every(
      (light) => Math.hypot(light.position.x - x, light.position.z - z) > 2.2
    );
    if (farFromPlayer && freeOfLight) break;
    x = randomGridCoordinate();
    z = randomGridCoordinate();
  }

  const top = topBlockY(x, z);
  const light = new THREE.Mesh(lightGeometry, lightMaterial);
  light.position.set(x, top + 1.35, z);
  light.castShadow = true;
  light.userData.baseY = light.position.y;
  scene.add(light);
  lightsInWorld.push(light);
}

function spawnLevelItems() {
  clearGoalItems();
  for (let i = 0; i < LEVELS[currentLevelIndex].goal; i += 1) {
    spawnGoalItem();
  }
}

function clearWeaponPickups() {
  while (weaponPickups.length > 0) {
    const pickup = weaponPickups.pop();
    scene.remove(pickup);
  }
}

function makeBowModel(scale = 1) {
  const group = new THREE.Group();
  const bow = new THREE.Mesh(
    new THREE.TorusGeometry(0.28 * scale, 0.022 * scale, 8, 28, Math.PI),
    avatarMaterials.bow
  );
  bow.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  group.add(bow);

  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008 * scale, 0.008 * scale, 0.56 * scale, 5),
    avatarMaterials.bowString
  );
  string.rotation.z = Math.PI / 2;
  group.add(string);

  const arrow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011 * scale, 0.011 * scale, 0.54 * scale, 6),
    avatarMaterials.arrow
  );
  arrow.rotation.x = Math.PI / 2;
  group.add(arrow);
  group.userData = { bow, string, arrow };
  return group;
}

function makeFireballModel(scale = 1) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 * scale, 1), avatarMaterials.fire);
  group.add(core);
  const glow = new THREE.PointLight(0xff7a2f, 0.8, 3);
  group.add(glow);
  return group;
}

function spawnWeaponPickupForLevel() {
  clearWeaponPickups();
  if (currentLevelIndex < 1) return;

  const kind = currentWeapon;
  const forward = horizontalForward();
  const right = horizontalRight();
  const position = avatar.position
    .clone()
    .addScaledVector(forward, 2.8)
    .addScaledVector(right, currentLevelIndex === 1 ? 1.55 : -1.55);

  position.x = Math.round(THREE.MathUtils.clamp(position.x, -WORLD_LIMIT + 2, WORLD_LIMIT - 2));
  position.z = Math.round(THREE.MathUtils.clamp(position.z, -WORLD_LIMIT + 2, WORLD_LIMIT - 2));

  const group = new THREE.Group();
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.56, 0.95),
    blockMaterials[currentLevelIndex === 1 ? 3 : 2]
  );
  block.position.y = 0.28;
  block.castShadow = true;
  block.receiveShadow = true;
  group.add(block);

  const model = kind === "bow" ? makeBowModel(1.15) : makeFireballModel(1.1);
  model.position.y = 0.88;
  group.add(model);

  const label = makeNameSprite(kind === "bow" ? "여분 활" : "불꽃 힘", "rgba(255,255,255,0.94)");
  label.scale.set(1.12, 0.4, 1);
  label.position.y = 1.45;
  group.add(label);

  group.position.set(position.x, 0, position.z);
  group.userData = {
    kind,
    collected: false,
    model,
    label: kind === "bow" ? "활과 화살" : "파이어볼"
  };
  scene.add(group);
  weaponPickups.push(group);
}

function emitSparkles(position, color = 0xffcf33, count = 16, power = 4) {
  const material = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < count; i += 1) {
    const sparkle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), material);
    sparkle.position.copy(position);
    sparkle.userData.life = 0.55 + Math.random() * 0.35;
    sparkle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * power,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * power
    );
    scene.add(sparkle);
    sparkles.push(sparkle);
  }
}

function makeFriend(config) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.58,
    metalness: 0.02
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: config.accent,
    roughness: 0.55
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.05, 4, 12), bodyMaterial);
  body.position.y = 0.98;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 12), bodyMaterial);
  head.position.y = 1.78;
  head.scale.set(1.05, 0.95, 1.05);
  head.castShadow = true;
  group.add(head);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x172026 });
  [-0.15, 0.15].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), eyeMaterial);
    eye.position.set(x, 1.85, 0.39);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), pupilMaterial);
    pupil.position.set(x, 1.84, 0.455);
    group.add(pupil);
  });

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), accentMaterial);
  belly.position.set(0, 0.93, 0.29);
  belly.scale.set(1.05, 1.2, 0.28);
  group.add(belly);

  let leftWing = null;
  let rightWing = null;
  if (config.kind === "flyer") {
    bodyMaterial.emissive = new THREE.Color(config.color);
    bodyMaterial.emissiveIntensity = 0.16;
    accentMaterial.emissive = new THREE.Color(config.accent);
    accentMaterial.emissiveIntensity = 0.2;
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: config.accent,
      emissive: config.accent,
      emissiveIntensity: 0.3,
      roughness: 0.48,
      side: THREE.DoubleSide
    });
    const leftWingShape = new THREE.Shape();
    leftWingShape.moveTo(-0.06, 0);
    leftWingShape.lineTo(-0.95, 0.34);
    leftWingShape.lineTo(-0.18, 0.74);
    leftWingShape.lineTo(-0.34, 0.34);
    leftWingShape.lineTo(-0.06, 0);
    const rightWingShape = new THREE.Shape();
    rightWingShape.moveTo(0.06, 0);
    rightWingShape.lineTo(0.95, 0.34);
    rightWingShape.lineTo(0.18, 0.74);
    rightWingShape.lineTo(0.34, 0.34);
    rightWingShape.lineTo(0.06, 0);
    leftWing = new THREE.Mesh(new THREE.ShapeGeometry(leftWingShape), wingMaterial);
    rightWing = new THREE.Mesh(new THREE.ShapeGeometry(rightWingShape), wingMaterial);
    leftWing.position.set(-0.22, 1.16, -0.08);
    rightWing.position.set(0.22, 1.16, -0.08);
    leftWing.rotation.y = -0.28;
    rightWing.rotation.y = 0.28;
    leftWing.castShadow = true;
    rightWing.castShadow = true;
    group.add(leftWing, rightWing);

    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0xf97030, roughness: 0.46 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.74, 0.47);
    group.add(beak);
  }

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: config.accent,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const threatRing = new THREE.Mesh(
    new THREE.TorusGeometry(config.kind === "zone" ? 2.05 : 0.86, 0.025, 8, 44),
    ringMaterial
  );
  threatRing.rotation.x = Math.PI / 2;
  threatRing.position.y = 0.065;
  group.add(threatRing);

  const label = makeNameSprite(config.name, "rgba(255,255,255,0.9)");
  label.scale.set(1.05, 0.38, 1);
  label.position.y = 2.62;
  group.add(label);

  const healthBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x172026 })
  );
  healthBack.position.set(0, 2.16, 0.32);
  group.add(healthBack);

  const healthFill = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.045, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x5ee37d })
  );
  healthFill.position.set(0, 2.16, 0.36);
  group.add(healthFill);

  group.position.set(config.home[0], 0, config.home[1]);
  group.userData = {
    name: config.name,
    kind: config.kind,
    color: config.color,
    home: new THREE.Vector3(config.home[0], 0, config.home[1]),
    phase: config.phase,
    speed: config.speed,
    hp: config.hp,
    maxHp: config.hp,
    active: false,
    defeated: false,
    nextAttack: 0,
    nextAbility: 0,
    stunUntil: 0,
    dashTarget: new THREE.Vector3(config.home[0], 0, config.home[1]),
    healthFill,
    bodyMaterial,
    accentMaterial,
    threatRing,
    ringMaterial,
    leftWing,
    rightWing,
    hitPulseUntil: 0,
    hitReactUntil: 0,
    hitNormal: new THREE.Vector3(0, 0, 1),
    dashingStarts: 0,
    warningUntil: 0,
    enragedUntil: 0,
    boxAlarmUntil: 0,
    lastBoxNoticeAt: -Infinity
  };
  group.visible = false;
  scene.add(group);
  friends.push(group);
}

makeFriend({
  name: "파랑",
  kind: "hunter",
  color: 0x4f8cf7,
  accent: 0x9ad7ff,
  home: [-7, -3],
  phase: 0.2,
  speed: 3.65,
  hp: 4
});
makeFriend({
  name: "초록",
  kind: "blind",
  color: 0x44b45f,
  accent: 0xb8f0a0,
  home: [8, 4],
  phase: 1.8,
  speed: 2.4,
  hp: 3
});
makeFriend({
  name: "주황",
  kind: "dash",
  color: 0xf97030,
  accent: 0xffd166,
  home: [6, -8],
  phase: 3.1,
  speed: 5.05,
  hp: 3
});
makeFriend({
  name: "보라",
  kind: "zone",
  color: 0x8d7bff,
  accent: 0xc8bfff,
  home: [-9, 8],
  phase: 4.4,
  speed: 2.65,
  hp: 4
});
makeFriend({
  name: "노랑",
  kind: "flyer",
  color: 0xffc857,
  accent: 0xfff1a8,
  home: [1, -10],
  phase: 5.4,
  speed: 4.0,
  hp: 3
});
makeFriend({
  name: "청록",
  kind: "watcher",
  color: 0x20c7b8,
  accent: 0xb5fff4,
  home: [-3, 10],
  phase: 6.6,
  speed: 3.15,
  hp: 4
});

const portal = new THREE.Group();
const portalDoorMaterial = new THREE.MeshStandardMaterial({
  color: 0x5db7de,
  emissive: 0x2b90bf,
  emissiveIntensity: 0.72,
  roughness: 0.36,
  transparent: true,
  opacity: 0.58,
  side: THREE.DoubleSide
});
const portalDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.35), portalDoorMaterial);
portalDoor.position.y = 1.4;
portal.add(portalDoor);

const portalFrameMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd166,
  emissive: 0x9a6a16,
  emissiveIntensity: 0.22,
  roughness: 0.5
});
[
  [-1.02, 1.28, 0, 0.18, 2.72, 0.24],
  [1.02, 1.28, 0, 0.18, 2.72, 0.24],
  [0, 2.55, 0, 2.22, 0.18, 0.24]
].forEach(([x, y, z, width, height, depth]) => {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), portalFrameMaterial);
  frame.position.set(x, y, z);
  frame.castShadow = true;
  portal.add(frame);
});

const portalRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.22, 0.11, 14, 42),
  new THREE.MeshStandardMaterial({
    color: 0x5db7de,
    emissive: 0x2b90bf,
    emissiveIntensity: 0.42,
    roughness: 0.42
  })
);
portalRing.rotation.y = Math.PI / 2;
portalRing.position.y = 1.45;
portalRing.scale.set(0.72, 1.02, 1);
portal.add(portalRing);

const portalBase = new THREE.Mesh(
  new THREE.BoxGeometry(2.8, 0.2, 0.5),
  new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.55 })
);
portalBase.position.y = 0.1;
portal.add(portalBase);
const portalLabel = makeNameSprite("다음 문", "rgba(255,255,255,0.94)");
portalLabel.scale.set(0.92, 0.34, 1);
portalLabel.position.y = 2.95;
portal.add(portalLabel);
portal.position.set(0, 0, -11);
portal.visible = false;
portal.userData.mode = "next";
scene.add(portal);

const guideBeam = new THREE.Group();
const guideCone = new THREE.Mesh(
  new THREE.ConeGeometry(0.34, 0.8, 4),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x49c6a5,
    emissiveIntensity: 0.55,
    roughness: 0.3
  })
);
guideCone.position.y = 0.4;
guideBeam.add(guideCone);
const guideRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.5, 0.035, 8, 24),
  new THREE.MeshBasicMaterial({ color: 0x49c6a5 })
);
guideRing.rotation.x = Math.PI / 2;
guideBeam.add(guideRing);
guideBeam.visible = upgrades.guideBeam;
scene.add(guideBeam);

const shopItems = [
  {
    id: "rainbowTrail",
    name: "무지개 발자국",
    description: "움직일 때 색 조각이 살짝 남아요.",
    cost: 18,
    swatch: "linear-gradient(135deg,#f97068,#ffd166,#49c6a5,#5db7de,#8d7bff)"
  },
  {
    id: "speedBoost",
    name: "가벼운 운동화",
    description: "이동과 점프가 더 쉬워져요.",
    cost: 22,
    swatch: "linear-gradient(135deg,#172026,#5db7de)"
  },
  {
    id: "rainbowBox",
    name: "무지개 상자",
    description: "상자 숨기 모양이 화려해져요.",
    cost: 16,
    swatch: "linear-gradient(135deg,#f9f1d2,#f97068,#ffd166,#49c6a5,#8d7bff)"
  },
  {
    id: "guideBeam",
    name: "빛 안내판",
    description: "가까운 빛 조각을 반짝여 보여줘요.",
    cost: 20,
    swatch: "linear-gradient(135deg,#ffffff,#49c6a5)"
  },
  {
    id: "powerGlove",
    name: "파워 장갑",
    description: "공격 피해와 밀어내는 힘이 조금 강해져요.",
    cost: 28,
    swatch: "linear-gradient(135deg,#ffcf33,#f97068)"
  },
  {
    id: "steadySoles",
    name: "균형 운동화",
    description: "몬스터에게 맞아도 덜 밀려나요.",
    cost: 24,
    swatch: "linear-gradient(135deg,#172026,#49c6a5)"
  },
  {
    id: "mapScanner",
    name: "달빛 스캐너",
    description: "미니맵에 더 먼 목표와 친구를 보여줘요.",
    cost: 26,
    swatch: "linear-gradient(135deg,#d8e9ff,#8d7bff,#20c7b8)"
  }
];

function applyUpgrade(id) {
  if (id === "rainbowTrail") upgrades.rainbowTrail = true;
  if (id === "speedBoost") upgrades.speedBoost = true;
  if (id === "powerGlove") upgrades.powerGlove = true;
  if (id === "steadySoles") upgrades.steadySoles = true;
  if (id === "mapScanner") upgrades.mapScanner = true;
  if (id === "guideBeam") {
    upgrades.guideBeam = true;
    guideBeam.visible = true;
  }
  if (id === "rainbowBox") {
    upgrades.rainbowBox = true;
    boxMaterial.map?.dispose();
    boxMaterial.map = makeBoxTexture(true);
    boxMaterial.needsUpdate = true;
  }
}

purchased.forEach((id) => applyUpgrade(id));

const cameraTarget = new THREE.Vector3();
let cameraYaw = 0.08;
let cameraPitch = 0.36;
let cameraDistance = 4.55;
let cameraPointerId = null;
let cameraPointerType = "mouse";
let lastPointer = { x: 0, y: 0 };
let cameraFollowYawTarget = null;
let lastManualCameraAt = -Infinity;
let avatarYawTarget = 0;
let avatarMovePhase = 0;
let avatarMovePower = 0;
let attackAnim = 0;
let hurtAnim = 0;
let attackWaveTimer = 0;
let cameraShake = 0;
let blockImpactTimer = 0;
let lastBlockImpactAt = -Infinity;
const blockImpactNormal = new THREE.Vector3();
let attackRecoveryTimer = 0;
let lastAttackWeapon = "push";
const carryState = {
  active: false,
  friend: null,
  timeLeft: 0,
  duration: 3.15
};

function horizontalForward() {
  return new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)).normalize();
}

function horizontalRight() {
  return new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw)).normalize();
}

function smoothAngle(current, target, amount) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

const localYAxis = new THREE.Vector3(0, 1, 0);

function setLocalCylinderBetween(mesh, start, end) {
  const direction = end.clone().sub(start);
  const length = Math.max(0.001, direction.length());
  mesh.position.copy(start).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(localYAxis, direction.normalize());
  mesh.scale.set(1, length, 1);
}

function currentBowChargeRatio() {
  if (!bowCharging) return bowChargePower;
  return THREE.MathUtils.clamp((elapsed - bowChargeStart) / BOW_MAX_CHARGE, 0, 1);
}

function updateHeldBowVisual(draw) {
  const visible = !isBoxed && currentWeapon === "bow";
  heldBow.visible = visible;
  if (!visible) return;

  const pull = new THREE.Vector3(0.5 + draw * 0.12, -0.02, -draw * 0.56);
  const top = new THREE.Vector3(0, 0.34, 0.02);
  const bottom = new THREE.Vector3(0, -0.34, 0.02);
  const arrowStart = pull.clone().add(new THREE.Vector3(-0.02, 0, 0));
  const arrowEnd = new THREE.Vector3(0.04, 0, 0.62 + draw * 0.18);
  const arrowDirection = arrowEnd.clone().sub(arrowStart).normalize();

  setLocalCylinderBetween(heldBow.userData.stringTop, top, pull);
  setLocalCylinderBetween(heldBow.userData.stringBottom, bottom, pull);
  setLocalCylinderBetween(heldBow.userData.arrow, arrowStart, arrowEnd);
  heldBow.userData.arrowTip.position.copy(arrowEnd);
  heldBow.userData.arrowTip.quaternion.setFromUnitVectors(localYAxis, arrowDirection);
  heldBow.rotation.set(-0.04 - draw * 0.07, -0.18 + draw * 0.05, -0.04);
  heldBow.scale.setScalar(1 + draw * 0.06);
}

function requestCameraFollow(direction, power) {
  if (power < 0.12 || cameraPointerId !== null) return;
  if (elapsed - lastManualCameraAt < 0.42 && !input.back && Math.abs(input.moveY) < 0.55) return;
  if (cameraFollowYawTarget !== null) return;

  cameraFollowYawTarget = Math.atan2(-direction.x, -direction.z);
}

function updateAvatarAnimation(delta) {
  attackAnim = Math.max(0, attackAnim - delta);
  hurtAnim = Math.max(0, hurtAnim - delta);
  attackWaveTimer = Math.max(0, attackWaveTimer - delta);
  blockImpactTimer = Math.max(0, blockImpactTimer - delta);

  avatar.rotation.y = smoothAngle(avatar.rotation.y, avatarYawTarget, 1 - Math.pow(0.0003, delta));
  avatarMovePhase += delta * (8 + avatarMovePower * 5);

  const runSwing = Math.sin(avatarMovePhase) * avatarMovePower;
  const attackDuration = lastAttackWeapon === "push" ? 0.34 : lastAttackWeapon === "bow" ? 0.38 : 0.3;
  const attackProgress = attackAnim > 0 ? 1 - attackAnim / attackDuration : 1;
  const attackRatio = attackAnim > 0 ? Math.sin((attackAnim / attackDuration) * Math.PI) : 0;
  const bowDraw =
    currentWeapon === "bow"
      ? bowCharging
        ? Math.max(0.08, currentBowChargeRatio())
        : lastAttackWeapon === "bow" && attackAnim > 0
          ? 0.22 + attackRatio * 0.32
          : 0.12
      : 0;
  updateHeldBowVisual(bowDraw);
  const pushReach =
    lastAttackWeapon === "push" && attackAnim > 0
      ? Math.sin(Math.min(1, attackProgress / 0.55) * Math.PI * 0.5) *
        (1 - Math.max(0, attackProgress - 0.72) / 0.28)
      : 0;
  const pushPrep =
    lastAttackWeapon === "push" && attackAnim > 0
      ? Math.sin(Math.min(1, attackProgress / 0.28) * Math.PI)
      : 0;
  const hurtRatio = hurtAnim > 0 ? hurtAnim / 0.45 : 0;
  const impactRatio = blockImpactTimer > 0 ? Math.sin((blockImpactTimer / 0.24) * Math.PI) : 0;
  const lunge = lastAttackWeapon === "push" ? pushReach * 0.2 : attackRatio * 0.07;

  leftArm.position.copy(baseLimbPose.leftArm);
  rightArm.position.copy(baseLimbPose.rightArm);
  leftHand.position.copy(baseLimbPose.leftHand);
  rightHand.position.copy(baseLimbPose.rightHand);
  leftArm.rotation.x = runSwing * 0.34;
  leftArm.rotation.y = 0;
  leftArm.rotation.z = 0;
  rightArm.rotation.x = -runSwing * 0.34 - attackRatio * 1.15;
  rightArm.rotation.y = 0;
  rightArm.rotation.z = 0;
  leftHand.rotation.x = leftArm.rotation.x;
  leftHand.rotation.y = 0;
  leftHand.rotation.z = 0;
  rightHand.rotation.x = rightArm.rotation.x;
  rightHand.rotation.y = 0;
  rightHand.rotation.z = 0;
  if (lastAttackWeapon === "push" && attackAnim > 0) {
    const handForward = pushReach * 0.92 - pushPrep * 0.16;
    const handLift = pushReach * 0.5 + pushPrep * 0.2;
    const handInward = pushReach * 0.24;
    const shoulderForward = pushReach * 0.34 - pushPrep * 0.08;
    leftArm.position.set(
      baseLimbPose.leftArm.x + handInward * 0.42,
      baseLimbPose.leftArm.y + handLift * 0.32,
      baseLimbPose.leftArm.z + shoulderForward
    );
    rightArm.position.set(
      baseLimbPose.rightArm.x - handInward * 0.42,
      baseLimbPose.rightArm.y + handLift * 0.32,
      baseLimbPose.rightArm.z + shoulderForward
    );
    leftHand.position.set(
      baseLimbPose.leftHand.x + handInward,
      baseLimbPose.leftHand.y + handLift,
      baseLimbPose.leftHand.z + handForward
    );
    rightHand.position.set(
      baseLimbPose.rightHand.x - handInward,
      baseLimbPose.rightHand.y + handLift,
      baseLimbPose.rightHand.z + handForward
    );
    leftArm.rotation.x = -0.45 - pushReach * 0.95 + pushPrep * 0.42;
    rightArm.rotation.x = -0.45 - pushReach * 0.95 + pushPrep * 0.42;
    leftArm.rotation.y = -0.28 * pushReach;
    rightArm.rotation.y = 0.28 * pushReach;
    leftArm.rotation.z = -0.2 * pushReach;
    rightArm.rotation.z = 0.2 * pushReach;
    leftHand.rotation.x = -0.18 - pushReach * 0.36;
    rightHand.rotation.x = -0.18 - pushReach * 0.36;
    leftHand.rotation.y = -0.22 * pushReach;
    rightHand.rotation.y = 0.22 * pushReach;
    const palmOpacity = pushReach * (1 - Math.max(0, attackProgress - 0.64) / 0.36);
    leftPushPalm.visible = palmOpacity > 0.03;
    rightPushPalm.visible = palmOpacity > 0.03;
    leftPushPalm.material.opacity = palmOpacity * 0.92;
    rightPushPalm.material.opacity = palmOpacity * 0.92;
    leftPushPalm.position.set(leftHand.position.x, leftHand.position.y + 0.04, leftHand.position.z + 0.12);
    rightPushPalm.position.set(rightHand.position.x, rightHand.position.y + 0.04, rightHand.position.z + 0.12);
    leftPushPalm.rotation.set(-0.08, -0.12, 0);
    rightPushPalm.rotation.set(-0.08, 0.12, 0);
    const palmScale = 1 + pushReach * 1.15;
    leftPushPalm.scale.setScalar(palmScale);
    rightPushPalm.scale.setScalar(palmScale);
  } else if (currentWeapon === "bow" || (lastAttackWeapon === "bow" && attackAnim > 0)) {
    leftPushPalm.visible = false;
    rightPushPalm.visible = false;
    const draw = bowDraw;
    leftArm.position.set(-0.48, 1.08, 0.32 + draw * 0.08);
    rightArm.position.set(0.24 + draw * 0.05, 1.06, 0.2 - draw * 0.18);
    leftHand.position.set(-0.38, 1.08, 0.57 + draw * 0.06);
    rightHand.position.set(0.18 + draw * 0.22, 1.04, 0.32 - draw * 0.62);
    leftArm.rotation.x = -0.82 - draw * 0.28;
    leftArm.rotation.y = -0.18;
    leftArm.rotation.z = -0.18;
    rightArm.rotation.x = -0.7 - draw * 0.62;
    rightArm.rotation.y = 0.18 + draw * 0.22;
    rightArm.rotation.z = 0.18;
    leftHand.rotation.x = leftArm.rotation.x;
    leftHand.rotation.y = -0.16;
    rightHand.rotation.x = rightArm.rotation.x;
    rightHand.rotation.y = 0.18 + draw * 0.28;
  } else if (lastAttackWeapon === "fireball") {
    leftPushPalm.visible = false;
    rightPushPalm.visible = false;
    leftArm.rotation.x = runSwing * 0.22;
    rightArm.rotation.x = -0.2 - attackRatio * 1.35;
    leftHand.rotation.x = leftArm.rotation.x;
    rightHand.rotation.x = rightArm.rotation.x;
  }
  if (!(lastAttackWeapon === "push" && attackAnim > 0)) {
    leftPushPalm.visible = false;
    rightPushPalm.visible = false;
    leftPushPalm.material.opacity = 0;
    rightPushPalm.material.opacity = 0;
  }
  leftLeg.rotation.x = -runSwing * 0.24;
  rightLeg.rotation.x = runSwing * 0.24;
  avatar.rotation.x =
    -pushReach * 0.11 - (lastAttackWeapon === "push" ? 0 : attackRatio * 0.045) + impactRatio * 0.06;
  avatar.rotation.z =
    Math.sin(elapsed * 42) * hurtRatio * 0.16 + impactRatio * THREE.MathUtils.clamp(blockImpactNormal.x, -1, 1) * 0.18;
  const forward = new THREE.Vector3(Math.sin(avatarYawTarget), 0, Math.cos(avatarYawTarget)).normalize();
  avatar.position.addScaledVector(forward, lunge);
  avatar.position.y += Math.abs(runSwing) * 0.035 + attackRatio * 0.035;
  handFireball.rotation.y += delta * 4.2;
  handFireball.position.set(0.68, 0.8 + attackRatio * 0.12, 0.18 + attackRatio * 0.32);
  handFireball.scale.setScalar(1 + Math.sin(elapsed * 7) * 0.12 + attackRatio * 0.24);

  if (attackWaveTimer > 0) {
    const ratio = Math.min(1, attackWaveTimer / (lastAttackWeapon === "push" ? 0.26 : 0.22));
    attackWave.visible = true;
    attackWave.material.opacity = ratio * 0.66;
    attackWave.scale.set(1.2 - ratio * 0.25, 0.26 + (1 - ratio) * 0.18, 1);
  } else {
    attackWave.visible = false;
    attackWave.material.opacity = 0;
  }
}

function triggerAttackMotion() {
  lastAttackWeapon = currentWeapon;
  attackAnim = currentWeapon === "push" ? 0.34 : currentWeapon === "bow" ? 0.38 : 0.3;
  attackWaveTimer = currentWeapon === "push" ? 0.26 : 0.22;
  attackWave.material.color.setHex(
    currentWeapon === "fireball" ? 0xff7a2f : currentWeapon === "bow" ? 0xf6f0d4 : 0xfff1a8
  );
  const forward = new THREE.Vector3(Math.sin(avatarYawTarget), 0, Math.cos(avatarYawTarget)).normalize();
  attackWave.position.copy(avatar.position).addScaledVector(forward, currentWeapon === "push" ? 1.55 : 1.25);
  attackWave.position.y += currentWeapon === "push" ? 0.82 : 0.95;
  attackWave.rotation.set(0, avatarYawTarget, 0);
}

function isOnSafeZone(x = playerBody.position.x, z = playerBody.position.z) {
  return safeZones.some((zone) => Math.hypot(zone.x - x, zone.z - z) < zone.radius);
}

function safeZoneAt(x = playerBody.position.x, z = playerBody.position.z) {
  return safeZones.find((zone) => Math.hypot(zone.x - x, zone.z - z) < zone.radius);
}

function bounceSafeZone(zone, power = 6.6) {
  if (!zone) return;
  zone.bounceUntil = elapsed + 0.38;
  zone.nextBounceAt = elapsed + 0.42;
  playerBody.velocity.y = Math.max(playerBody.velocity.y, power);
  speedBurstTimer = Math.max(speedBurstTimer, 0.45);
}

function startCarry(friend) {
  if (carryState.active) return;

  if (isBoxed) {
    isBoxed = false;
    boxMotionNoise = 0;
    boxCover.visible = false;
    applyAvatarAppearance(false);
    boxButton.classList.remove("active");
  }

  carryState.active = true;
  carryState.friend = friend;
  carryState.timeLeft = carryState.duration;
  friend.userData.nextAttack = elapsed + 4.2;
  friend.userData.dashingUntil = 0;
  friend.userData.warningUntil = 0;
  playerBody.wakeUp();
  playerBody.velocity.set(0, 0, 0);
  playerBody.position.y = 3.45;
  hurtAnim = 0.2;
  cameraShake = Math.max(cameraShake, 0.65);
  playSound("monster");
  showMessage("노랑이 낚아챘어요! 안전지대로 조종");
}

function finishCarry() {
  const zone = safeZoneAt();
  const safe = Boolean(zone);
  const friend = carryState.friend;
  carryState.active = false;
  carryState.friend = null;

  if (friend?.userData) {
    friend.userData.nextAttack = elapsed + 3.8;
    friend.userData.nextAbility = elapsed + 2.4;
  }

  playerBody.velocity.x *= 0.25;
  playerBody.velocity.z *= 0.25;
  playerBody.velocity.y = safe ? 6.8 : -5.2;

  if (safe) {
    bounceSafeZone(zone, 7.4);
    playSound("collect");
    emitSparkles(avatar.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 0x49c6a5, 20, 2.8);
    showMessage("트램폴린 안전 착지");
  } else {
    hurtAnim = 0.55;
    cameraShake = Math.max(cameraShake, 1.2);
    playerHitCooldown = 0.8;
    playSound("hit");
    emitSparkles(avatar.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xffc857, 16, 3.8);
    showMessage("쿵! 다음엔 안전지대");
  }
}

function updateCamera(delta) {
  const player = avatar.position;
  cameraTarget.set(player.x, player.y + 1.28, player.z);

  if (cameraFollowYawTarget !== null && cameraPointerId === null) {
    cameraYaw = smoothAngle(cameraYaw, cameraFollowYawTarget, 1 - Math.pow(0.02, delta));
    const remaining = Math.abs(Math.atan2(Math.sin(cameraFollowYawTarget - cameraYaw), Math.cos(cameraFollowYawTarget - cameraYaw)));
    if (remaining < 0.015) cameraFollowYawTarget = null;
  }

  const cosPitch = Math.cos(cameraPitch);
  const desired = new THREE.Vector3(
    cameraTarget.x + Math.sin(cameraYaw) * cosPitch * cameraDistance,
    cameraTarget.y + Math.sin(cameraPitch) * cameraDistance,
    cameraTarget.z + Math.cos(cameraYaw) * cosPitch * cameraDistance
  );

  if (cameraShake > 0) {
    const shake = cameraShake * 0.05;
    desired.x += (Math.random() - 0.5) * shake;
    desired.y += (Math.random() - 0.5) * shake;
    desired.z += (Math.random() - 0.5) * shake;
    cameraShake = Math.max(0, cameraShake - delta * 4.2);
  }

  camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
  camera.lookAt(cameraTarget);
}

function updateTreeOcclusion(delta) {
  treeCanopies.forEach((canopy) => {
    const distance = canopy.position.distanceTo(camera.position);
    const targetOpacity = distance < 2.8 ? 0.24 : distance < 4.4 ? 0.58 : 1;
    canopy.material.opacity = THREE.MathUtils.lerp(
      canopy.material.opacity ?? 1,
      targetOpacity,
      1 - Math.pow(0.0005, delta)
    );
    canopy.material.depthWrite = canopy.material.opacity > 0.72;
  });

  treeObstacles.forEach((tree) => {
    const ratio = Math.max(0, (tree.bumpUntil - elapsed) / 0.34);
    const wobble = Math.sin((1 - ratio) * Math.PI * 4 + tree.phase) * ratio;
    tree.trunk.rotation.z = wobble * 0.055;
    tree.crown.rotation.z = wobble * 0.075;
    tree.shadowCrown.rotation.z = wobble * 0.065;
    tree.crown.position.y = tree.baseCrownY + Math.sin(elapsed * 1.1 + tree.phase) * 0.018 + ratio * 0.08;
    tree.shadowCrown.position.y = tree.baseShadowY + Math.sin(elapsed * 1.2 + tree.phase) * 0.016 + ratio * 0.06;
  });
}

function updateNightLighting(delta) {
  const player = avatar.position;
  const forward = horizontalForward();
  playerLantern.position.set(player.x, player.y + 1.35, player.z);
  playerLantern.intensity = 5.8 + Math.sin(elapsed * 9) * 0.35;

  flashlight.position.set(player.x, player.y + 1.75, player.z);
  flashlightTarget.position
    .copy(player)
    .addScaledVector(forward, 9)
    .add(new THREE.Vector3(0, 0.75, 0));

  stars.rotation.y += delta * 0.01;
  moonGlow.material.opacity = 0.62 + Math.sin(elapsed * 0.9) * 0.08;

  fireflies.forEach((firefly) => {
    const phase = elapsed * 1.7 + firefly.userData.phase;
    firefly.position.x = firefly.userData.baseX + Math.sin(phase * 0.9) * 0.34;
    firefly.position.y = 0.9 + Math.sin(phase * 1.35) * 0.42;
    firefly.position.z = firefly.userData.baseZ + Math.cos(phase) * 0.34;
    firefly.material.opacity = 0.35 + Math.sin(phase * 2.4) * 0.28;
  });
}

function updateMonsterVisibility(friend, distance) {
  const data = friend.userData;
  if (!data.active || data.defeated) {
    friend.visible = false;
    return;
  }

  const revealDistance = data.kind === "dash" || data.kind === "flyer" ? 10.5 : 8.2;
  const abilityVisible =
    (data.dashingUntil > 0 && elapsed < data.dashingUntil + 0.35) ||
    (data.warningUntil > 0 && elapsed < data.warningUntil + 0.2) ||
    (data.stunUntil > 0 && elapsed < data.stunUntil + 0.2);
  friend.visible = distance < revealDistance || abilityVisible;
}

function detectsMovingBox(friend, distance, playerMoving, playerPosition) {
  if (!isBoxed || !playerMoving || boxMotionNoise < 0.55) return false;
  const data = friend.userData;
  const range =
    data.kind === "watcher" ? 9.0 : data.kind === "blind" ? 7.8 : data.kind === "flyer" ? 7.4 : 8.4;
  if (distance > range) return false;
  if (data.kind === "blind") return boxMotionNoise > 0.72;

  const toPlayer = playerPosition.clone().sub(friend.position);
  toPlayer.y = 0;
  if (toPlayer.lengthSq() < 0.001) return true;
  toPlayer.normalize();

  const forward = new THREE.Vector3();
  friend.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.001) forward.copy(toPlayer);
  forward.normalize();
  const visionDot = forward.dot(toPlayer);
  return visionDot > 0.12 || distance < 3.1 || boxMotionNoise > 1.08;
}

function updateFlyerWings(data, fast = false) {
  if (!data.leftWing || !data.rightWing) return;

  const flap = Math.sin(elapsed * (fast ? 16 : 9.5) + data.phase) * (fast ? 0.55 : 0.34);
  data.leftWing.rotation.z = -0.12 - flap;
  data.rightWing.rotation.z = 0.12 + flap;
}

const rayResult = new CANNON.RaycastResult();

function isGrounded() {
  rayResult.reset();
  const start = playerBody.position;
  const end = new CANNON.Vec3(start.x, start.y - 0.72, start.z);
  world.raycastClosest(
    start,
    end,
    {
      skipBackfaces: true
    },
    rayResult
  );
  return rayResult.hasHit;
}

function currentLevel() {
  return LEVELS[currentLevelIndex];
}

function activeEnemyGoal() {
  return currentLevel().activeFriends.length;
}

function weaponForLevel(index) {
  if (index >= 2) return "fireball";
  if (index >= 1) return "bow";
  return "push";
}

function unlockedWeaponsForLevel(index = currentLevelIndex) {
  const maxIndex = WEAPON_ORDER.indexOf(weaponForLevel(index));
  return WEAPON_ORDER.slice(0, maxIndex + 1);
}

function updateWeaponHud() {
  const weapon = WEAPONS[currentWeapon];
  weaponCount.textContent = weapon.label;
  attackButton.textContent = weapon.symbol;
  attackButton.dataset.label = weapon.button;
  attackButton.dataset.key = currentWeapon === "bow" ? "F 꾹" : "F";
  attackButton.title = `${weapon.label} 공격`;
  attackButton.setAttribute("aria-label", `${weapon.label} 공격`);
  if (weaponButton) {
    weaponButton.dataset.label = `무기: ${weapon.label}`;
    weaponButton.title = `무기 바꾸기: ${weapon.label}`;
    weaponButton.setAttribute("aria-label", `무기 바꾸기, 현재 ${weapon.label}`);
  }
}

function setCurrentWeapon(kind, silent = false) {
  if (!unlockedWeaponsForLevel().includes(kind)) return false;
  if (bowCharging) cancelBowCharge();
  currentWeapon = kind;
  updateWeaponHud();
  applyAvatarAppearance(false);
  if (!silent) showMessage(`${WEAPONS[currentWeapon].label} 장착`);
  return true;
}

function cycleWeapon(direction = 1) {
  const unlocked = unlockedWeaponsForLevel();
  const currentIndex = Math.max(0, unlocked.indexOf(currentWeapon));
  const next = unlocked[(currentIndex + direction + unlocked.length) % unlocked.length];
  setCurrentWeapon(next);
}

function setWeaponForLevel(index) {
  currentWeapon = weaponForLevel(index);
  setCurrentWeapon(currentWeapon, true);
}

function updateLevelHud() {
  const level = currentLevel();
  levelCount.textContent = `${currentLevelIndex + 1}/${LEVELS.length}`;
  goalLabel.textContent = level.goalLabel;
  starCount.textContent = `${lights}/${level.goal}`;
  enemyCount.textContent = `${enemiesDefeated}/${activeEnemyGoal()}`;
}

function setFriendHealth(friend) {
  const data = friend.userData;
  const ratio = Math.max(data.hp, 0) / data.maxHp;
  data.healthFill.scale.x = ratio;
  data.healthFill.position.x = -(1 - ratio) * 0.41;
  data.healthFill.material.color.setHex(ratio > 0.45 ? 0x5ee37d : 0xffd166);
}

function resetFriend(friend, active) {
  const data = friend.userData;
  data.active = active;
  data.defeated = false;
  data.hp = data.maxHp;
  data.nextAttack = 0;
  data.nextAbility = elapsed + 1 + Math.random() * 2;
  data.stunUntil = 0;
  data.dashingUntil = 0;
  data.dashingStarts = 0;
  data.warningUntil = 0;
  data.hitPulseUntil = 0;
  data.hitReactUntil = 0;
  data.hitNormal.set(0, 0, 1);
  data.enragedUntil = 0;
  data.boxAlarmUntil = 0;
  data.lastBoxNoticeAt = -Infinity;
  data.ringMaterial.opacity = 0;
  friend.position.copy(data.home);
  friend.position.y = 0;
  friend.scale.set(1, 1, 1);
  friend.visible = false;
  setFriendHealth(friend);
}

function startLevel(index) {
  currentLevelIndex = index;
  lights = 0;
  enemiesDefeated = 0;
  attackCooldown = 0;
  playerHitCooldown = 0;
  attackRecoveryTimer = 0;
  speedBurstTimer = 0;
  levelPortalOpen = false;
  portal.visible = false;
  portal.userData.mode = index >= LEVELS.length - 1 ? "final" : "next";
  setWeaponForLevel(index);
  spawnLevelItems();
  spawnWeaponPickupForLevel();

  const activeNames = new Set(currentLevel().activeFriends);
  friends.forEach((friend) => resetFriend(friend, activeNames.has(friend.userData.name)));
  updateLevelHud();
  showMessage(`${currentLevel().intro} · 무기: ${WEAPONS[currentWeapon].label}`);
}

function openLevelPortal() {
  levelPortalOpen = true;
  const forward =
    avatarMovePower > 0.05
      ? new THREE.Vector3(Math.sin(avatarYawTarget), 0, Math.cos(avatarYawTarget)).normalize()
      : horizontalForward();
  const portalYaw = Math.atan2(forward.x, forward.z);
  const position = avatar.position.clone().addScaledVector(forward, 4.35);
  position.x = THREE.MathUtils.clamp(position.x, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
  position.z = THREE.MathUtils.clamp(position.z, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
  portal.position.set(position.x, 0, position.z);
  portal.rotation.y = portalYaw;
  portal.userData.mode = currentLevelIndex < LEVELS.length - 1 ? "next" : "final";
  portalLabel.material.map?.dispose();
  portalLabel.material.map = makeLabelTexture(portal.userData.mode === "next" ? "다음 문" : "탈출 문", "rgba(255,255,255,0.94)");
  portalLabel.material.needsUpdate = true;
  portal.visible = true;
  emitSparkles(portal.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 0x5db7de, 22, 3.2);
}

function checkLevelCompletion() {
  const level = currentLevel();
  if (lights < level.goal || enemiesDefeated < activeEnemyGoal()) return;
  if (levelPortalOpen) return;

  addGold(10 + currentLevelIndex * 4);
  openLevelPortal();
  playSound("clear");
  showMessage(currentLevelIndex < LEVELS.length - 1 ? "앞에 다음 문이 열렸어요" : "앞에 탈출 문이 열렸어요");
}

function defeatFriend(friend) {
  const data = friend.userData;
  if (data.defeated) return;

  data.defeated = true;
  data.active = false;
  friend.visible = false;
  enemiesDefeated += 1;
  enemyCount.textContent = `${enemiesDefeated}/${activeEnemyGoal()}`;
  addGold(6);
  emitSparkles(friend.position.clone().add(new THREE.Vector3(0, 1.1, 0)), data.color, 24, 5);
  showMessage(`${data.name} 처치`);
  checkLevelCompletion();
}

function clampWorldPosition(position, margin = 1.4) {
  position.x = THREE.MathUtils.clamp(position.x, -WORLD_LIMIT + margin, WORLD_LIMIT - margin);
  position.z = THREE.MathUtils.clamp(position.z, -WORLD_LIMIT + margin, WORLD_LIMIT - margin);
}

function registerBlockImpact(normalX, normalZ, push = 0) {
  blockImpactNormal.set(normalX, 0, normalZ);
  blockImpactTimer = Math.max(blockImpactTimer, 0.24);

  const horizontalSpeed = Math.hypot(playerBody.velocity.x, playerBody.velocity.z);
  if (elapsed - lastBlockImpactAt < 0.16 || horizontalSpeed < 0.35 || push < 0.012) return;

  lastBlockImpactAt = elapsed;
  cameraShake = Math.max(cameraShake, Math.min(0.46, 0.14 + horizontalSpeed * 0.035));
  playSound("bump");
  emitSparkles(
    new THREE.Vector3(
      playerBody.position.x - normalX * 0.36,
      playerBody.position.y + 0.08,
      playerBody.position.z - normalZ * 0.36
    ),
    0xf6f0d4,
    7,
    1.8
  );
}

function registerTreeImpact(tree, normalX, normalZ, push = 0) {
  blockImpactNormal.set(normalX, 0, normalZ);
  blockImpactTimer = Math.max(blockImpactTimer, 0.2);

  const horizontalSpeed = Math.hypot(playerBody.velocity.x, playerBody.velocity.z);
  if (push < 0.01 || horizontalSpeed < 0.3) return;

  tree.bumpUntil = Math.max(tree.bumpUntil, elapsed + 0.34);
  if (elapsed < tree.nextDropAt) return;

  tree.nextDropAt = elapsed + TREE_BUMP_COOLDOWN + Math.random() * 0.7;
  cameraShake = Math.max(cameraShake, 0.18);
  playSound("bump");

  const dropPosition = new THREE.Vector3(tree.x, 0.92, tree.z);
  const roll = Math.random();
  if (roll < 0.52) {
    const amount = 3 + Math.floor(Math.random() * 6);
    addGold(amount);
    emitSparkles(dropPosition, 0xffcf33, 12, 2.6);
    showMessage(`나무 골드 +${amount}`);
    return;
  }

  if (roll < 0.9) {
    spawnBugMonster(tree);
    emitSparkles(dropPosition, 0xa7c957, 14, 2.4);
    showMessage("벌레몬스터 튀어나옴");
    return;
  }

  const bonus = 18 + Math.floor(Math.random() * 10);
  addGold(bonus);
  speedBurstTimer = Math.max(speedBurstTimer, 5.5);
  emitSparkles(dropPosition, 0x8d7bff, 28, 4.8);
  showMessage(`희귀 별 보상 +${bonus}`);
}

function removeVelocityIntoNormal(normalX, normalZ) {
  const inwardSpeed = playerBody.velocity.x * normalX + playerBody.velocity.z * normalZ;
  if (inwardSpeed >= 0) return 0;

  playerBody.velocity.x -= normalX * inwardSpeed;
  playerBody.velocity.z -= normalZ * inwardSpeed;
  const rebound = Math.min(1.65, -inwardSpeed * 0.18);
  playerBody.velocity.x += normalX * rebound;
  playerBody.velocity.z += normalZ * rebound;
  return -inwardSpeed;
}

function resolvePlayerBlockCollisions(previousPosition = null, options = {}) {
  const radius = PLAYER_RADIUS + 0.05;
  const padding = 0.015;
  const playerBottom = playerBody.position.y - PLAYER_RADIUS + 0.04;
  const playerTop = playerBody.position.y + PLAYER_RADIUS - 0.04;
  let collided = false;
  const allowImpact = options.impact !== false;

  const resolve = (normalX, normalZ, push) => {
    collided = true;
    playerBody.position.x += normalX * push;
    playerBody.position.z += normalZ * push;
    const hitSpeed = removeVelocityIntoNormal(normalX, normalZ);
    if (allowImpact) registerBlockImpact(normalX, normalZ, Math.max(push, hitSpeed * 0.012));
  };

  blocks.forEach((block) => {
    const center = block.body.position;
    const blockBottom = center.y - 0.5;
    const blockTop = center.y + 0.5;
    const standingOnTop = playerBody.position.y - PLAYER_RADIUS >= blockTop - 0.08;
    const sideOverlaps =
      !standingOnTop && playerTop > blockBottom + 0.05 && playerBottom < blockTop - 0.05;
    if (!sideOverlaps) return;

    const minX = center.x - 0.5;
    const maxX = center.x + 0.5;
    const minZ = center.z - 0.5;
    const maxZ = center.z + 0.5;
    const closestX = THREE.MathUtils.clamp(playerBody.position.x, minX, maxX);
    const closestZ = THREE.MathUtils.clamp(playerBody.position.z, minZ, maxZ);
    const offsetX = playerBody.position.x - closestX;
    const offsetZ = playerBody.position.z - closestZ;
    const distanceSq = offsetX * offsetX + offsetZ * offsetZ;

    if (distanceSq >= radius * radius) return;

    if (distanceSq > 0.0001) {
      const distance = Math.sqrt(distanceSq);
      const normalX = offsetX / distance;
      const normalZ = offsetZ / distance;
      const push = radius - distance + padding;
      resolve(normalX, normalZ, push);
      return;
    }

    const leftDistance = Math.abs(playerBody.position.x - (minX - radius));
    const rightDistance = Math.abs(maxX + radius - playerBody.position.x);
    const frontDistance = Math.abs(playerBody.position.z - (minZ - radius));
    const backDistance = Math.abs(maxZ + radius - playerBody.position.z);
    const cameFromX = previousPosition
      ? Math.abs(previousPosition.x - playerBody.position.x) >=
        Math.abs(previousPosition.z - playerBody.position.z)
      : leftDistance < frontDistance || rightDistance < backDistance;

    if (cameFromX && leftDistance <= rightDistance) {
      resolve(-1, 0, Math.abs(playerBody.position.x - (minX - radius - padding)));
    } else if (cameFromX) {
      resolve(1, 0, Math.abs(maxX + radius + padding - playerBody.position.x));
    } else if (frontDistance <= backDistance) {
      resolve(0, -1, Math.abs(playerBody.position.z - (minZ - radius - padding)));
    } else {
      resolve(0, 1, Math.abs(maxZ + radius + padding - playerBody.position.z));
    }
  });

  return collided;
}

function resolvePlayerTreeCollisions(options = {}) {
  const radius = PLAYER_RADIUS + 0.06;
  let collided = false;
  const allowImpact = options.impact !== false;

  treeObstacles.forEach((tree) => {
    const minDistance = radius + tree.radius;
    const offsetX = playerBody.position.x - tree.x;
    const offsetZ = playerBody.position.z - tree.z;
    const distanceSq = offsetX * offsetX + offsetZ * offsetZ;
    if (distanceSq >= minDistance * minDistance) return;

    const distance = Math.max(0.001, Math.sqrt(distanceSq));
    const normalX = distanceSq < 0.0001 ? 1 : offsetX / distance;
    const normalZ = distanceSq < 0.0001 ? 0 : offsetZ / distance;
    const push = minDistance - distance + 0.018;
    playerBody.position.x += normalX * push;
    playerBody.position.z += normalZ * push;
    const hitSpeed = removeVelocityIntoNormal(normalX, normalZ);
    if (allowImpact) registerTreeImpact(tree, normalX, normalZ, Math.max(push, hitSpeed * 0.01));
    collided = true;
  });

  return collided;
}

function resolvePlayerEnvironmentCollisions(previousPosition = null, options = {}) {
  const blockHit = resolvePlayerBlockCollisions(previousPosition, options);
  const treeHit = resolvePlayerTreeCollisions(options);
  return blockHit || treeHit;
}

function movePlayerHorizontally(deltaX, deltaZ, options = {}) {
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance < 0.0001) return false;

  const steps = Math.max(1, Math.ceil(distance / 0.16));
  const stepX = deltaX / steps;
  const stepZ = deltaZ / steps;
  let collided = false;

  for (let i = 0; i < steps; i += 1) {
    const previousPosition = { x: playerBody.position.x, z: playerBody.position.z };
    playerBody.position.x += stepX;
    playerBody.position.z += stepZ;
    collided = resolvePlayerEnvironmentCollisions(previousPosition, options) || collided;
  }

  return collided;
}

function separatePlayerAndFriend(friend, direction, amount = 0.24) {
  if (!direction || direction.lengthSq() < 0.001) direction = new THREE.Vector3(1, 0, 0);
  direction.normalize();

  movePlayerHorizontally(direction.x * amount, direction.z * amount);
  playerBody.velocity.x += direction.x * amount * 8;
  playerBody.velocity.z += direction.z * amount * 8;
  friend.position.addScaledVector(direction, -amount * 1.28);
  clampWorldPosition(playerBody.position, 1.2);
  clampWorldPosition(friend.position, 1.2);
}

function makeBugMonster() {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f9e44,
    emissive: 0x1f6f3d,
    emissiveIntensity: 0.18,
    roughness: 0.62
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), bodyMaterial);
  shell.scale.set(1.35, 0.62, 1);
  shell.position.y = 0.28;
  shell.castShadow = true;
  group.add(shell);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xfff6df });
  [-0.09, 0.09].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMaterial);
    eye.position.set(x, 0.36, 0.27);
    group.add(eye);
  });

  const legMaterial = new THREE.MeshBasicMaterial({ color: 0x172026 });
  [-0.2, 0, 0.2].forEach((z) => {
    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), legMaterial);
      leg.position.set(side * 0.24, 0.18, z);
      leg.rotation.z = side * 0.88;
      group.add(leg);
    });
  });

  group.userData = {
    hp: 1,
    nextAttack: 0,
    lifeUntil: elapsed + 18,
    hitUntil: 0,
    phase: Math.random() * Math.PI * 2
  };
  return group;
}

function spawnBugMonster(tree) {
  if (bugs.length >= 7) {
    addGold(5);
    showMessage("벌레 대신 골드 +5");
    return;
  }

  const bug = makeBugMonster();
  const angle = Math.random() * Math.PI * 2;
  bug.position.set(tree.x + Math.cos(angle) * 0.85, 0, tree.z + Math.sin(angle) * 0.85);
  scene.add(bug);
  bugs.push(bug);
}

function removeBug(bug, reward = 0) {
  const index = bugs.indexOf(bug);
  if (index >= 0) bugs.splice(index, 1);
  scene.remove(bug);
  if (reward > 0) addGold(reward);
}

function damageBug(bug, damage, direction, options = {}) {
  if (!bug || bug.userData.hp <= 0) return false;
  if (!direction || direction.lengthSq() < 0.001) {
    direction = bug.position.clone().sub(avatar.position);
    direction.y = 0;
    if (direction.lengthSq() < 0.001) direction.set(1, 0, 0);
    direction.normalize();
  }

  bug.userData.hp -= damage;
  bug.userData.hitUntil = elapsed + 0.3;
  bug.position.addScaledVector(direction, options.knockback ?? 0.58);
  clampWorldPosition(bug.position, 1.2);
  emitSparkles(
    options.sparkPosition ?? bug.position.clone().add(new THREE.Vector3(0, 0.42, 0)),
    options.color ?? 0xa7c957,
    options.sparkCount ?? 10,
    options.sparkPower ?? 2.5
  );
  playSound("hit");

  if (bug.userData.hp <= 0) {
    removeBug(bug, options.reward ?? 4);
    showMessage(options.message ?? "벌레 처치 +4");
  }
  return true;
}

function damageBugsInRadius(center, radius, damage, options = {}) {
  let hit = false;
  for (let i = bugs.length - 1; i >= 0; i -= 1) {
    const bug = bugs[i];
    const distance = bug.position.distanceTo(center);
    if (distance > radius) continue;
    const direction = bug.position.clone().sub(center);
    direction.y = 0;
    if (direction.lengthSq() < 0.001) direction.set(1, 0, 0);
    direction.normalize();
    damageBug(bug, damage, direction, {
      ...options,
      knockback: options.knockback ?? 1.05,
      sparkPosition: bug.position.clone().add(new THREE.Vector3(0, 0.42, 0)),
      message: false
    });
    hit = true;
  }
  return hit;
}

function damageFriend(friend, damage, direction, options = {}) {
  const data = friend.userData;
  if (!data.active || data.defeated) return false;

  if (!direction || direction.lengthSq() < 0.001) {
    direction = friend.position.clone().sub(avatar.position);
    direction.y = 0;
    if (direction.lengthSq() < 0.001) direction.set(1, 0, 0);
    direction.normalize();
  }

  data.hp -= damage;
  data.stunUntil = elapsed + (options.stun ?? 0.5);
  data.hitPulseUntil = elapsed + 0.28;
  data.hitReactUntil = elapsed + (options.hitReact ?? 0.36);
  data.hitNormal.copy(direction);
  friend.position.addScaledVector(direction, options.knockback ?? 0.65);
  clampWorldPosition(friend.position, 1.2);
  attackRecoveryTimer = Math.max(attackRecoveryTimer, options.recovery ?? 0.28);
  setFriendHealth(friend);
  emitSparkles(
    options.sparkPosition ?? friend.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
    options.color ?? data.color,
    options.sparkCount ?? 18,
    options.sparkPower ?? 3.6
  );
  playSound("hit");

  if (data.hp <= 0) {
    defeatFriend(friend);
  } else if (options.message !== false) {
    showMessage(options.message ?? `${data.name} 체력 -${damage}`);
  }

  return true;
}

function makeArrowProjectile() {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 7), avatarMaterials.arrow);
  shaft.rotation.x = Math.PI / 2;
  group.add(shaft);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x172026, roughness: 0.42 })
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.48;
  group.add(tip);
  return group;
}

function makeFireballProjectile() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), avatarMaterials.fire);
  group.add(core);
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.34, 1),
    new THREE.MeshBasicMaterial({ color: 0xffcf33, transparent: true, opacity: 0.22 })
  );
  group.add(shell);
  const light = new THREE.PointLight(0xff7a2f, 1.7, 4);
  group.add(light);
  return group;
}

function spawnProjectile(kind, charge = BOW_MIN_POWER) {
  const forward = new THREE.Vector3(Math.sin(avatarYawTarget), 0, Math.cos(avatarYawTarget)).normalize();
  const mesh = kind === "fireball" ? makeFireballProjectile() : makeArrowProjectile();
  const arrowPower = kind === "arrow" ? THREE.MathUtils.clamp(charge, BOW_MIN_POWER, 1) : 0;
  mesh.position.copy(avatar.position).add(new THREE.Vector3(0, 1.05, 0)).addScaledVector(forward, 0.9);
  mesh.rotation.y = avatarYawTarget;
  if (kind === "arrow") mesh.scale.setScalar(0.9 + arrowPower * 0.22);
  scene.add(mesh);

  projectiles.push({
    kind,
    mesh,
    velocity: forward.multiplyScalar(kind === "fireball" ? 8.2 : 10.6 + arrowPower * 8.2),
    life: kind === "fireball" ? 1.15 : 0.72 + arrowPower * 0.88,
    radius: kind === "fireball" ? 0.55 : 0.42,
    damage: kind === "fireball" ? 3 : 1 + Math.round(arrowPower * 2),
    charge: arrowPower,
    hit: false
  });
}

function explodeFireball(projectile) {
  const center = projectile.mesh.position.clone();
  let hit = false;
  friends.forEach((friend) => {
    const data = friend.userData;
    if (!data.active || data.defeated) return;
    const target = friend.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    const distance = target.distanceTo(center);
    if (distance > 2.35) return;

    const direction = friend.position.clone().sub(center);
    direction.y = 0;
    if (direction.lengthSq() < 0.001) direction.set(1, 0, 0);
    direction.normalize();
    damageFriend(friend, projectile.damage + (upgrades.powerGlove ? 1 : 0), direction, {
      knockback: 1.05,
      stun: 0.82,
      sparkPosition: center,
      color: 0xff7a2f,
      sparkCount: 22,
      sparkPower: 4.6,
      message: false
    });
    hit = true;
  });

  if (damageBugsInRadius(center, 2.2, projectile.damage + (upgrades.powerGlove ? 1 : 0), {
    color: 0xff7a2f,
    sparkCount: 16,
    sparkPower: 3.6,
    reward: 5,
    message: false
  })) {
    hit = true;
  }

  emitSparkles(center, 0xff7a2f, hit ? 28 : 14, hit ? 5.2 : 3.4);
  showMessage(hit ? "파이어볼 폭발" : "파이어볼 슝");
}

function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.life -= delta;
    projectile.mesh.position.addScaledVector(projectile.velocity, delta);
    projectile.mesh.rotation.z += delta * (projectile.kind === "fireball" ? 8 : 18);

    let remove = projectile.life <= 0;

    friends.forEach((friend) => {
      if (remove || projectile.hit || !friend.userData.active || friend.userData.defeated) return;
      const target = friend.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      if (target.distanceTo(projectile.mesh.position) > projectile.radius + 0.42) return;

      const direction = friend.position.clone().sub(projectile.mesh.position);
      direction.y = 0;
      if (direction.lengthSq() < 0.001) {
        direction.copy(projectile.velocity).setY(0);
      }
      direction.normalize();

      if (projectile.kind === "fireball") {
        explodeFireball(projectile);
      } else {
        const charge = projectile.charge ?? BOW_MIN_POWER;
        damageFriend(friend, projectile.damage + (upgrades.powerGlove ? 1 : 0), direction, {
          knockback: 0.5 + charge * 1.18,
          stun: 0.38 + charge * 0.52,
          hitReact: 0.36 + charge * 0.22,
          sparkPosition: projectile.mesh.position.clone(),
          color: 0xf6f0d4,
          sparkCount: 12 + Math.round(charge * 9),
          sparkPower: 2.7 + charge * 1.4,
          message: charge > 0.82 ? "강한 화살 명중" : "화살 명중"
        });
      }
      projectile.hit = true;
      remove = true;
    });

    if (!remove && !projectile.hit) {
      for (let bugIndex = bugs.length - 1; bugIndex >= 0; bugIndex -= 1) {
        const bug = bugs[bugIndex];
        if (bug.position.distanceTo(projectile.mesh.position) > projectile.radius + 0.38) continue;
        const direction = bug.position.clone().sub(projectile.mesh.position);
        direction.y = 0;
        if (direction.lengthSq() < 0.001) direction.copy(projectile.velocity).setY(0);
        direction.normalize();
        const charge = projectile.charge ?? BOW_MIN_POWER;
        if (projectile.kind === "fireball") {
          explodeFireball(projectile);
        } else {
          damageBug(bug, projectile.damage, direction, {
            knockback: 0.48 + charge * 0.9,
            color: 0xf6f0d4,
            sparkCount: 10,
            reward: 5,
            message: "벌레 명중"
          });
        }
        projectile.hit = true;
        remove = true;
        break;
      }
    }

    if (projectile.kind === "fireball" && projectile.life <= 0 && !projectile.hit) {
      explodeFireball(projectile);
    }

    if (remove) {
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function cancelBowCharge() {
  if (!bowCharging) return;
  bowCharging = false;
  bowChargePower = 0;
  attackButton.classList.remove("charging");
  attackButton.style.setProperty("--charge", "0");
}

function startBowCharge() {
  if (won || attackCooldown > 0 || currentWeapon !== "bow") return false;
  if (carryState.active) {
    showMessage("잡힌 동안은 안전지대로 조종");
    return false;
  }
  if (isBoxed) {
    showMessage("상자 안에서는 활 못 써요");
    return false;
  }
  if (bowCharging) return true;

  bowCharging = true;
  bowChargeStart = elapsed;
  bowChargePower = 0;
  lastAttackWeapon = "bow";
  playTone(260, 0.08, "triangle", 0.035);
  showMessage("활 당기는 중");
  return true;
}

function fireChargedBow() {
  if (!bowCharging) return false;

  const rawCharge = currentBowChargeRatio();
  const power = BOW_MIN_POWER + rawCharge * (1 - BOW_MIN_POWER);
  bowCharging = false;
  bowChargePower = power;
  attackCooldown = WEAPONS.bow.cooldown + power * 0.16;
  attackButton.classList.add("cooling");
  attackButton.classList.remove("charging");
  attackButton.style.setProperty("--charge", "0");
  triggerAttackMotion();
  playSound("attack");
  spawnProjectile("arrow", power);
  showMessage(power > 0.82 ? "강한 화살 발사" : power > 0.52 ? "화살 발사" : "빠른 화살");
  return true;
}

function startAttackInput(event = null) {
  event?.preventDefault?.();
  if (currentWeapon === "bow") {
    startBowCharge();
    return;
  }
  attack();
}

function releaseAttackInput(event = null) {
  event?.preventDefault?.();
  fireChargedBow();
}

function attack() {
  if (won || attackCooldown > 0) return;

  if (carryState.active) {
    showMessage("잡힌 동안은 안전지대로 조종");
    return;
  }

  if (isBoxed) {
    showMessage("상자 안에서는 공격 못해요");
    return;
  }

  if (currentWeapon === "bow") {
    if (startBowCharge()) fireChargedBow();
    return;
  }

  attackCooldown = WEAPONS[currentWeapon].cooldown;
  attackButton.classList.add("cooling");
  triggerAttackMotion();
  playSound("attack");
  const origin = avatar.position.clone().add(new THREE.Vector3(0, 0.9, 0));
  const forward = new THREE.Vector3(Math.sin(avatarYawTarget), 0, Math.cos(avatarYawTarget)).normalize();

  if (currentWeapon === "fireball") {
    spawnProjectile("fireball");
    showMessage("파이어볼 발사");
    return;
  }

  let hit = false;

  friends.forEach((friend) => {
    const data = friend.userData;
    if (!data.active || data.defeated) return;

    const toFriend = friend.position.clone().sub(avatar.position);
    toFriend.y = 0;
    const distance = toFriend.length();
    const direction = distance > 0 ? toFriend.clone().normalize() : forward.clone();
    const facing = direction.dot(forward);

    if (distance > ATTACK_RANGE || facing < 0.18) return;

    hit = true;
    const damage = (playerBody.position.y > 1.15 ? 2 : 1) + (upgrades.powerGlove ? 1 : 0);
    damageFriend(friend, damage, direction, {
      stun: upgrades.powerGlove ? 0.72 : 0.5,
      knockback: upgrades.powerGlove ? 1.02 : 0.68,
      sparkPosition: origin.clone().addScaledVector(forward, 1.15),
      color: data.color,
      sparkCount: 20,
      sparkPower: 3.8
    });
  });

  for (let i = bugs.length - 1; i >= 0; i -= 1) {
    const bug = bugs[i];
    const toBug = bug.position.clone().sub(avatar.position);
    toBug.y = 0;
    const distance = toBug.length();
    const direction = distance > 0 ? toBug.clone().normalize() : forward.clone();
    const facing = direction.dot(forward);
    if (distance > ATTACK_RANGE * 0.72 || facing < 0.12) continue;
    hit = true;
    damageBug(bug, 1 + (upgrades.powerGlove ? 1 : 0), direction, {
      knockback: upgrades.powerGlove ? 1.1 : 0.72,
      sparkPosition: origin.clone().addScaledVector(forward, 1),
      color: 0xa7c957,
      sparkCount: 12,
      sparkPower: 2.8
    });
  }

  if (!hit) {
    emitSparkles(origin.clone().addScaledVector(forward, 1.1), 0xffcf33, 8, 2.2);
    showMessage("조금 더 가까이");
  }
}

function monsterAttack(friend, text, strength = 4.8) {
  const data = friend.userData;
  if (won || elapsed < data.nextAttack || playerHitCooldown > 0) return;

  data.nextAttack = elapsed + HIT_COOLDOWN + currentLevelIndex * 0.04;
  playerHitCooldown = upgrades.steadySoles ? HIT_COOLDOWN * 0.62 : HIT_COOLDOWN;

  const away = avatar.position.clone().sub(friend.position);
  away.y = 0;
  if (away.lengthSq() < 0.001) away.set(1, 0, 0);
  away.normalize();
  const finalStrength = strength * (upgrades.steadySoles ? 0.56 : 1);

  playerBody.wakeUp();
  movePlayerHorizontally(
    away.x * (upgrades.steadySoles ? 0.28 : 0.45),
    away.z * (upgrades.steadySoles ? 0.28 : 0.45)
  );
  playerBody.velocity.x = away.x * finalStrength;
  playerBody.velocity.z = away.z * finalStrength;
  playerBody.velocity.y = Math.max(playerBody.velocity.y, data.kind === "flyer" ? 10.5 : 3.8);
  friend.position.addScaledVector(away, data.kind === "dash" ? -0.78 : -0.48);
  clampWorldPosition(friend.position, 1.2);
  data.stunUntil = Math.max(data.stunUntil, elapsed + (data.kind === "dash" ? 0.95 : 0.82));
  data.hitPulseUntil = Math.max(data.hitPulseUntil, elapsed + 0.18);
  hurtAnim = 0.45;
  cameraShake = Math.max(cameraShake, data.kind === "dash" ? 1.4 : 0.9);
  emitSparkles(avatar.position.clone().add(new THREE.Vector3(0, 0.9, 0)), data.color, 14, 4.4);
  playSound("monster");
  showMessage(text);
}

function placeBlock() {
  if (won) return;

  const forward = horizontalForward();
  const x = Math.round(playerBody.position.x + forward.x * 2.05);
  const z = Math.round(playerBody.position.z + forward.z * 2.05);
  const y = topBlockY(x, z) + 1;

  if (!inWorld(x, z) || y > 6) {
    showMessage("여기는 조금 좁아요");
    return;
  }

  if (Math.hypot(x - playerBody.position.x, z - playerBody.position.z) < 1.25 && y < 2) {
    showMessage("한 걸음만 물러나면 좋아요");
    return;
  }

  if (addBlock(x, y, z, selectedColor, false)) {
    placedBlocks += 1;
    addGold(1);
    emitSparkles(new THREE.Vector3(x, y + 1.05, z), palette[selectedColor].color, 10);
    showMessage(["딱 좋아요", "멋진 블록", "골드 +1"][placedBlocks % 3]);
  }
}

function eraseBlock() {
  if (won) return;

  const forward = horizontalForward();
  const x = Math.round(playerBody.position.x + forward.x * 2.05);
  const z = Math.round(playerBody.position.z + forward.z * 2.05);
  const y = topBlockY(x, z);

  if (y < 0 || !removeBlock(x, y, z)) {
    showMessage("지울 수 있는 블록이 없어요");
    return;
  }

  showMessage("깔끔해졌어요");
}

function toggleBox() {
  cancelBowCharge();
  isBoxed = !isBoxed;
  boxCover.visible = isBoxed;
  if (isBoxed) {
    avatarParts.forEach((part) => {
      part.visible = false;
    });
  } else {
    boxMotionNoise = 0;
    applyAvatarAppearance(false);
  }
  boxButton.classList.toggle("active", isBoxed);
  playSound("shop");
  showMessage(isBoxed ? "상자 모드" : "다시 출발");
}

function showMessage(text) {
  message.textContent = text;
  message.classList.add("show");
  showMessageTimer = 1.9;
}

function checkPortal() {
  checkLevelCompletion();
}

function completeGame() {
  if (won) return;
  won = true;
  const reward = 12;
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, "0");
  finalSummary.textContent = "모든 목표와 친구를 넘고 무지개 문을 열었어요.";
  clearTime.textContent = `시간 ${minutes}:${seconds}`;
  clearReward.textContent = `보상 +${reward} 골드`;
  winPanel.classList.add("show");
  addGold(reward);
  playSound("clear");
  emitSparkles(portal.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 0x5db7de, 26);
}

function updateHud(delta) {
  elapsed += delta;
  attackCooldown = Math.max(0, attackCooldown - delta);
  playerHitCooldown = Math.max(0, playerHitCooldown - delta);
  speedBurstTimer = Math.max(0, speedBurstTimer - delta);
  attackRecoveryTimer = Math.max(0, attackRecoveryTimer - delta);

  if (bowCharging) {
    if (won || carryState.active || isBoxed || currentWeapon !== "bow") {
      cancelBowCharge();
    } else {
      bowChargePower = currentBowChargeRatio();
      attackButton.classList.add("charging");
      attackButton.style.setProperty("--charge", bowChargePower.toFixed(3));
    }
  }

  attackButton.classList.toggle("cooling", attackCooldown > 0);

  const movingInBox =
    isBoxed &&
    (Math.abs(input.moveX) + Math.abs(input.moveY) > 0.16 ||
      input.forward ||
      input.back ||
      input.left ||
      input.right ||
      Math.hypot(playerBody.velocity.x, playerBody.velocity.z) > 1.65);
  if (movingInBox) {
    boxMotionNoise = Math.min(BOX_NOISE_LIMIT, boxMotionNoise + delta * 0.78);
  } else {
    boxMotionNoise = Math.max(0, boxMotionNoise - delta * 0.55);
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, "0");
  timeCount.textContent = `${minutes}:${seconds}`;

  if (showMessageTimer > 0) {
    showMessageTimer -= delta;
    if (showMessageTimer <= 0) message.classList.remove("show");
  }
}

function updateMovement(delta) {
  const forward = horizontalForward();
  const right = horizontalRight();
  const wish = new THREE.Vector3();
  const previousPosition = { x: playerBody.position.x, z: playerBody.position.z };
  const keyboardX = Number(input.right) - Number(input.left);
  const keyboardY = Number(input.back) - Number(input.forward);
  const moveX = THREE.MathUtils.clamp(keyboardX + input.moveX, -1, 1);
  const moveY = THREE.MathUtils.clamp(keyboardY + input.moveY, -1, 1);
  const movePower = Math.min(1, Math.hypot(moveX, moveY));
  avatarMovePower = movePower;

  wish.addScaledVector(right, moveX);
  wish.addScaledVector(forward, -moveY);

  if (carryState.active) {
    carryState.timeLeft -= delta;
    playerBody.wakeUp();

    if (movePower > 0.01 && wish.lengthSq() > 0.001) {
      wish.normalize();
      avatarYawTarget = Math.atan2(wish.x, wish.z);
      requestCameraFollow(wish, movePower);
      movePlayerHorizontally(wish.x * 5.8 * delta, wish.z * 5.8 * delta, { impact: false });
    }

    playerBody.position.x = THREE.MathUtils.clamp(
      playerBody.position.x,
      -WORLD_LIMIT + 1.4,
      WORLD_LIMIT - 1.4
    );
    playerBody.position.z = THREE.MathUtils.clamp(
      playerBody.position.z,
      -WORLD_LIMIT + 1.4,
      WORLD_LIMIT - 1.4
    );
    playerBody.position.y = 3.35 + Math.sin(elapsed * 5) * 0.12;
    playerBody.velocity.set(0, 0, 0);

    if (carryState.friend) {
      carryState.friend.visible = true;
      carryState.friend.position.set(playerBody.position.x, 2.3, playerBody.position.z);
      carryState.friend.rotation.y += delta * 3.2;
    }

    if (carryState.timeLeft <= 0) finishCarry();
    return;
  }

  const recoverySlow = attackRecoveryTimer > 0 ? 0.78 : 1;
  const speed =
    (upgrades.speedBoost || speedBurstTimer > 0 ? 11.8 : 9.4) *
    (isBoxed ? 0.62 : 1) *
    recoverySlow *
    Math.max(0.42, movePower);
  const grounded = isGrounded();

  if (movePower > 0.01 || input.jump) {
    playerBody.wakeUp();
  }

  if (movePower > 0.01 && wish.lengthSq() > 0.001) {
    wish.normalize();
    const acceleration = attackRecoveryTimer > 0 ? 0.23 : 0.32;
    const blocked = movePlayerHorizontally(wish.x * speed * delta * 0.38, wish.z * speed * delta * 0.38);
    const velocityScale = blocked ? 0.1 : 0.16;
    playerBody.velocity.x += (wish.x * speed * velocityScale - playerBody.velocity.x) * acceleration;
    playerBody.velocity.z += (wish.z * speed * velocityScale - playerBody.velocity.z) * acceleration;
    avatarYawTarget = Math.atan2(wish.x, wish.z);
    requestCameraFollow(wish, movePower);
  } else {
    playerBody.velocity.x *= 0.58;
    playerBody.velocity.z *= 0.58;
  }

  if (input.jump && grounded) {
    playerBody.velocity.y = upgrades.speedBoost ? 13.2 : 11.4;
    speedBurstTimer = 0.55;
    input.jump = false;
    playSound("jump");
  }

  playerBody.position.x = THREE.MathUtils.clamp(
    playerBody.position.x,
    -WORLD_LIMIT - 1.6,
    WORLD_LIMIT + 1.6
  );
  playerBody.position.z = THREE.MathUtils.clamp(
    playerBody.position.z,
    -WORLD_LIMIT - 1.6,
    WORLD_LIMIT + 1.6
  );
  resolvePlayerEnvironmentCollisions(previousPosition);

  if (playerBody.position.y < -4) {
    playerBody.position.set(0, 3, 5);
    playerBody.velocity.set(0, 0, 0);
    showMessage("안전한 곳으로 이동");
  }
}

function syncAvatar(delta = 0) {
  avatar.position.set(
    playerBody.position.x,
    playerBody.position.y - 0.45,
    playerBody.position.z
  );
  updateAvatarAnimation(delta);
}

function updateLights(delta) {
  const playerCenter = avatar.position.clone().add(new THREE.Vector3(0, 0.75, 0));

  for (let i = lightsInWorld.length - 1; i >= 0; i -= 1) {
    const light = lightsInWorld[i];
    light.rotation.x += delta * 1.8;
    light.rotation.y += delta * 2.4;
    light.position.y = light.userData.baseY + Math.sin(elapsed * 3 + i) * 0.12;

    if (light.position.distanceTo(playerCenter) < COLLECT_RADIUS) {
      lights += 1;
      starCount.textContent = `${Math.min(lights, currentLevel().goal)}/${currentLevel().goal}`;
      addGold(8);
      playSound("collect");
      emitSparkles(light.position.clone());
      scene.remove(light);
      lightsInWorld.splice(i, 1);
      showMessage(lights >= currentLevel().goal ? "목표 완료" : `${currentLevel().goalLabel} +1`);
      checkLevelCompletion();
    }
  }
}

function updateFriends(delta) {
  const playerPosition = avatar.position.clone();
  const pressure = 1 + currentLevelIndex * 0.1;
  friends.forEach((friend) => {
    const data = friend.userData;
    if (!data.active || data.defeated) return;

    if (carryState.active && carryState.friend === friend) {
      friend.visible = true;
      data.ringMaterial.opacity = 0.5;
      data.threatRing.scale.setScalar(1.25 + Math.sin(elapsed * 10) * 0.08);
      updateFlyerWings(data, true);
      return;
    }

    const playerMoving =
      Math.abs(input.moveX) + Math.abs(input.moveY) > 0.14 ||
      input.forward ||
      input.back ||
      input.left ||
      input.right ||
      Math.hypot(playerBody.velocity.x, playerBody.velocity.z) > 2.4 ||
      playerBody.position.y > 1.25;
    const wander = data.home.clone();
    wander.x += Math.sin(elapsed * 0.55 + data.phase) * 2.4;
    wander.z += Math.cos(elapsed * 0.48 + data.phase) * 2.1;

    const flatToPlayer = playerPosition.clone().sub(friend.position);
    flatToPlayer.y = 0;
    const distance = flatToPlayer.length();
    updateMonsterVisibility(friend, distance);
    const movingBoxDetected = detectsMovingBox(friend, distance, playerMoving, playerPosition);
    if (movingBoxDetected) {
      data.boxAlarmUntil = elapsed + (data.kind === "watcher" ? 1.45 : 1.05);
      if (elapsed - data.lastBoxNoticeAt > 1.4) {
        data.lastBoxNoticeAt = elapsed;
        showMessage("움직이는 상자 들킴!");
      }
    }
    const boxAlarmed = isBoxed && elapsed < data.boxAlarmUntil;
    const target = wander.clone();
    let pace = data.speed * 0.46 * pressure;
    let attackDistance = 1.18;
    data.ringMaterial.opacity = 0;
    data.threatRing.scale.setScalar(1);
    const hitReactRatio = Math.max(0, (data.hitReactUntil - elapsed) / 0.38);
    const hitJolt = Math.sin(hitReactRatio * Math.PI);
    const pulse = elapsed < data.hitPulseUntil ? 0.1 : 0;
    friend.scale.set(1 + pulse + hitJolt * 0.14, 1 + pulse * 0.4 - hitJolt * 0.08, 1 + pulse + hitJolt * 0.14);
    const hitLeanX = data.hitNormal.z * hitJolt * 0.34;
    const hitLeanZ = -data.hitNormal.x * hitJolt * 0.34;
    if (data.kind === "flyer") {
      updateFlyerWings(data, elapsed < data.warningUntil || elapsed < data.dashingUntil);
    }

    if (elapsed < data.stunUntil) {
      friend.rotation.x = hitLeanX;
      friend.rotation.z = Math.sin(elapsed * 35) * 0.12 + hitLeanZ;
      data.ringMaterial.opacity = 0.35;
      return;
    }

    friend.rotation.x = hitLeanX;
    friend.rotation.z = hitLeanZ;

    if (data.kind === "hunter") {
      if ((!isBoxed && distance < 10.5) || boxAlarmed) {
        target.copy(playerPosition);
        pace = data.speed * (boxAlarmed ? 0.92 : 1.12) * pressure;
        data.ringMaterial.opacity = boxAlarmed ? 0.42 : 0.22;
        data.threatRing.scale.setScalar(1.1 + Math.sin(elapsed * 7) * 0.05);
      }
      attackDistance = 1.18;
    }

    if (data.kind === "blind") {
      pace = data.speed * 0.48 * pressure;
      if ((!isBoxed && playerMoving && distance < 8.4) || boxAlarmed) {
        target.copy(playerPosition);
        pace = data.speed * (boxAlarmed ? 1.05 : 1.35) * pressure;
        data.ringMaterial.opacity = 0.3;
        data.threatRing.scale.setScalar(1.45);
      }
      attackDistance = 1.72;
    }

    if (data.kind === "dash") {
      if (elapsed > data.nextAbility && distance < 11.5 && (!isBoxed || boxAlarmed)) {
        data.nextAbility = elapsed + Math.max(2.55, 3.6 - currentLevelIndex * 0.18);
        data.warningUntil = elapsed + 0.68;
        data.dashingStarts = data.warningUntil;
        data.dashingUntil = data.warningUntil + 0.82;
        data.dashTarget.copy(playerPosition);
        showMessage("주황 돌진 준비");
        playSound("monster");
      }

      if (elapsed < data.warningUntil) {
        target.copy(friend.position);
        pace = 0;
        data.ringMaterial.opacity = 0.55;
        data.threatRing.scale.setScalar(1.6 + Math.sin(elapsed * 18) * 0.14);
        emitSparkles(friend.position.clone().add(new THREE.Vector3(0, 0.5, 0)), data.color, 2, 0.7);
      } else if (elapsed < data.dashingUntil) {
        target.copy(data.dashTarget);
        pace = data.speed * 2.35 * pressure;
        data.ringMaterial.opacity = 0.38;
        emitSparkles(friend.position.clone().add(new THREE.Vector3(0, 0.5, 0)), data.color, 2, 1.2);
      } else {
        pace = data.speed * 0.44 * pressure;
      }
      attackDistance = 1.22;
    }

    if (data.kind === "zone") {
      pace = data.speed * 0.34 * pressure;
      data.ringMaterial.opacity = 0.16 + Math.sin(elapsed * 3) * 0.05;
      data.threatRing.scale.setScalar(1.1 + Math.sin(elapsed * 2) * 0.06);
      const inZone = distance < 4.7;
      if (inZone && playerBody.position.y < 1.15 && (!isBoxed || boxAlarmed)) {
        target.copy(playerPosition);
        pace = data.speed * 1.02 * pressure;
        playerBody.velocity.x *= 0.8;
        playerBody.velocity.z *= 0.8;
        data.ringMaterial.opacity = 0.38;
      }
      attackDistance = inZone ? 1.45 : 1.05;
    }

    if (data.kind === "flyer") {
      friend.position.y = 0.85 + Math.sin(elapsed * 2.4 + data.phase) * 0.24;
      if (elapsed > data.nextAbility && distance < 9.5 && (!isBoxed || boxAlarmed)) {
        data.nextAbility = elapsed + Math.max(3.25, 4.6 - currentLevelIndex * 0.2);
        data.warningUntil = elapsed + 0.64;
        data.dashingStarts = data.warningUntil;
        data.dashingUntil = data.warningUntil + 1.05;
        data.dashTarget.copy(playerPosition);
        showMessage("노랑 급습 준비");
        playSound("monster");
      }
      if (elapsed < data.warningUntil) {
        target.copy(friend.position);
        pace = data.speed * 0.12;
        data.ringMaterial.opacity = 0.5;
        data.threatRing.scale.setScalar(1.55);
      } else if (elapsed < data.dashingUntil) {
        target.copy(data.dashTarget);
        pace = data.speed * 1.9 * pressure;
        data.ringMaterial.opacity = 0.34;
      } else {
        pace = data.speed * 0.46 * pressure;
      }
      attackDistance = 1.38;
    } else {
      friend.position.y = Math.sin(elapsed * 2.2 + data.phase) * 0.05;
    }

    if (data.kind === "watcher") {
      const detected = (!isBoxed && distance < 9.2) || boxAlarmed;
      if (detected) {
        data.enragedUntil = elapsed + 1.35;
      }
      if (elapsed < data.enragedUntil) {
        target.copy(playerPosition);
        pace = data.speed * (boxAlarmed ? 0.92 : 1.06) * pressure;
        data.ringMaterial.opacity = 0.42;
        data.threatRing.scale.setScalar(1.25 + Math.sin(elapsed * 12) * 0.08);
      } else {
        pace = data.speed * 0.28 * pressure;
      }
      attackDistance = 1.16;
    }

    const toTarget = target.sub(friend.position);
    toTarget.y = 0;
    if (toTarget.lengthSq() > 0.04) {
      toTarget.normalize();
      friend.position.addScaledVector(toTarget, pace * delta);
    }

    if (distance > 0.1) {
      friend.lookAt(playerPosition.x, friend.position.y, playerPosition.z);
    }
    if (hitJolt > 0.001) {
      friend.rotation.x += hitLeanX;
      friend.rotation.z += hitLeanZ;
    }

    const currentToPlayer = playerPosition.clone().sub(friend.position);
    currentToPlayer.y = 0;
    let currentDistance = currentToPlayer.length();
    if (!carryState.active && currentDistance > 0.001 && currentDistance < 0.86) {
      const separation = (0.86 - currentDistance) * 0.2 + 0.045;
      separatePlayerAndFriend(friend, currentToPlayer, separation);
      data.stunUntil = Math.max(data.stunUntil, elapsed + 0.16);
      currentDistance = Math.hypot(
        playerBody.position.x - friend.position.x,
        playerBody.position.z - friend.position.z
      );
    }

    if (currentDistance < attackDistance) {
      if (data.kind === "flyer") {
        if (isBoxed && !boxAlarmed) {
          showMessage("상자 안에서 조용히");
          return;
        }
        if (elapsed >= data.nextAttack && !carryState.active) startCarry(friend);
        return;
      }

      if (isBoxed && !boxAlarmed) {
        showMessage(boxMotionNoise > 0.35 ? "상자 안에서는 살금살금" : "조용히 있으면 지나가요");
        return;
      }

      const attackText = {
        hunter: "파랑 공격! 상자나 반격",
        blind: "초록 팔에 닿았어요",
        dash: "주황 돌진 명중",
        zone: "보라 구역 공격",
        flyer: "노랑이 띄웠어요",
        watcher: "청록 감지 공격"
      }[data.kind];

      monsterAttack(friend, attackText, data.kind === "flyer" ? 6.8 : 5.2);
    }
  });
}

function updateBugs(delta) {
  const playerPosition = avatar.position.clone();
  for (let i = bugs.length - 1; i >= 0; i -= 1) {
    const bug = bugs[i];
    const data = bug.userData;
    if (elapsed > data.lifeUntil) {
      emitSparkles(bug.position.clone().add(new THREE.Vector3(0, 0.35, 0)), 0xa7c957, 6, 1.6);
      removeBug(bug);
      continue;
    }

    const toPlayer = playerPosition.clone().sub(bug.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    const hitRatio = Math.max(0, (data.hitUntil - elapsed) / 0.3);
    bug.scale.set(1 + hitRatio * 0.25, 1 - hitRatio * 0.12, 1 + hitRatio * 0.25);
    bug.position.y = 0.05 + Math.abs(Math.sin(elapsed * 12 + data.phase)) * 0.08;

    if (distance > 0.1) {
      toPlayer.normalize();
      if (distance < 7.4 && !isBoxed) bug.position.addScaledVector(toPlayer, delta * 2.55);
      bug.lookAt(playerPosition.x, bug.position.y, playerPosition.z);
    }

    if (distance < 0.72 && elapsed >= data.nextAttack && playerHitCooldown <= 0) {
      data.nextAttack = elapsed + 1.2;
      playerHitCooldown = 0.38;
      const away = playerPosition.clone().sub(bug.position);
      away.y = 0;
      if (away.lengthSq() < 0.001) away.set(1, 0, 0);
      away.normalize();
      movePlayerHorizontally(away.x * 0.18, away.z * 0.18);
      playerBody.velocity.x += away.x * 2.5;
      playerBody.velocity.z += away.z * 2.5;
      hurtAnim = 0.22;
      emitSparkles(avatar.position.clone().add(new THREE.Vector3(0, 0.55, 0)), 0xa7c957, 8, 2.2);
      playSound("monster");
      showMessage("벌레가 톡!");
    }
  }
}

function updateTrail(delta) {
  if (!upgrades.rainbowTrail || isBoxed) return;

  const moving =
    Math.abs(playerBody.velocity.x) + Math.abs(playerBody.velocity.z) > 2.2 && isGrounded();
  if (!moving) return;

  trailTimer -= delta;
  if (trailTimer > 0) return;
  trailTimer = 0.14;
  const color = palette[Math.floor(elapsed * 7) % palette.length].color;
  const position = avatar.position.clone().add(new THREE.Vector3(0, 0.08, 0));
  emitSparkles(position, color, 5, 1.8);
}

function updateGuide(delta) {
  if (!upgrades.guideBeam || lightsInWorld.length === 0) {
    guideBeam.visible = false;
    return;
  }

  let nearest = lightsInWorld[0];
  let nearestDistance = Infinity;
  lightsInWorld.forEach((light) => {
    const distance = light.position.distanceTo(avatar.position);
    if (distance < nearestDistance) {
      nearest = light;
      nearestDistance = distance;
    }
  });

  guideBeam.visible = true;
  guideBeam.position.copy(nearest.position).add(new THREE.Vector3(0, 1.05, 0));
  guideBeam.rotation.y += delta * 2.2;
  guideCone.position.y = 0.45 + Math.sin(elapsed * 3) * 0.08;
}

function updateWeaponPickups(delta) {
  weaponPickups.forEach((pickup) => {
    pickup.userData.model.rotation.y += delta * 1.8;
    pickup.userData.model.position.y = 0.88 + Math.sin(elapsed * 3.4) * 0.08;

    if (pickup.userData.collected) return;
    if (pickup.position.distanceTo(avatar.position) > 1.75) return;

    pickup.userData.collected = true;
    emitSparkles(pickup.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffcf33, 18, 3);
    playSound("shop");
    showMessage(`${pickup.userData.label} 준비 완료`);
  });
}

function updateSafeZones(delta) {
  safeZones.forEach((zone, index) => {
    const bounceRatio = Math.max(0, (zone.bounceUntil - elapsed) / 0.38);
    const squash = Math.sin(bounceRatio * Math.PI);
    zone.ring.rotation.z += delta * (0.8 + index * 0.12);
    zone.ring.material.opacity = 0.64 + Math.sin(elapsed * 3 + index) * 0.18;
    zone.pad.scale.set(1 + squash * 0.08, 1 - squash * 0.28, 1 + squash * 0.08);
    zone.mat.scale.set(1 + squash * 0.16, 1, 1 + squash * 0.16);
    zone.mat.position.y = 0.34 - squash * 0.055;
    zone.ring.position.y = 0.39 + squash * 0.05;

    const onPad =
      !carryState.active &&
      Math.hypot(playerBody.position.x - zone.x, playerBody.position.z - zone.z) < zone.radius * 0.72 &&
      playerBody.position.y < 1.18 &&
      playerBody.velocity.y <= 0.3;
    if (onPad && elapsed > zone.nextBounceAt) {
      bounceSafeZone(zone, 5.8);
      playSound("jump");
      emitSparkles(new THREE.Vector3(zone.x, 0.55, zone.z), 0x49c6a5, 8, 1.8);
      showMessage("트램폴린 점프");
    }
  });
}

function updateMiniMap() {
  if (!miniMapContext || !miniMap) return;

  const size = miniMap.width;
  const center = size / 2;
  const scale = size / ((WORLD_LIMIT + 3) * 2);
  const toMap = (x, z) => [center + x * scale, center + z * scale];

  miniMapContext.clearRect(0, 0, size, size);
  miniMapContext.fillStyle = "rgba(7,16,31,0.9)";
  miniMapContext.fillRect(0, 0, size, size);

  miniMapContext.strokeStyle = "rgba(255,255,255,0.16)";
  miniMapContext.lineWidth = 2;
  miniMapContext.strokeRect(center - WORLD_LIMIT * scale, center - WORLD_LIMIT * scale, WORLD_LIMIT * 2 * scale, WORLD_LIMIT * 2 * scale);

  miniMapContext.strokeStyle = "rgba(93,183,222,0.38)";
  miniMapContext.lineWidth = 7;
  miniMapContext.beginPath();
  miniMapContext.moveTo(center, center - WORLD_LIMIT * scale);
  miniMapContext.lineTo(center, center + WORLD_LIMIT * scale);
  miniMapContext.moveTo(center - WORLD_LIMIT * scale, center);
  miniMapContext.lineTo(center + WORLD_LIMIT * scale, center);
  miniMapContext.stroke();

  safeZones.forEach((zone) => {
    const [x, y] = toMap(zone.x, zone.z);
    miniMapContext.strokeStyle = "#49c6a5";
    miniMapContext.lineWidth = 2;
    miniMapContext.beginPath();
    miniMapContext.arc(x, y, Math.max(4, zone.radius * scale), 0, Math.PI * 2);
    miniMapContext.stroke();
  });

  lightsInWorld.forEach((light) => {
    const distance = light.position.distanceTo(avatar.position);
    if (!upgrades.mapScanner && distance > 7.5) return;
    const [x, y] = toMap(light.position.x, light.position.z);
    miniMapContext.fillStyle = "#ffcf33";
    miniMapContext.beginPath();
    miniMapContext.arc(x, y, upgrades.mapScanner ? 3.6 : 3, 0, Math.PI * 2);
    miniMapContext.fill();
  });

  friends.forEach((friend) => {
    const data = friend.userData;
    if (!data.active || data.defeated) return;
    const distance = friend.position.distanceTo(avatar.position);
    if (!upgrades.mapScanner && !friend.visible && distance > 6.5) return;
    const [x, y] = toMap(friend.position.x, friend.position.z);
    miniMapContext.fillStyle = `#${data.color.toString(16).padStart(6, "0")}`;
    miniMapContext.beginPath();
    miniMapContext.arc(x, y, 3.8, 0, Math.PI * 2);
    miniMapContext.fill();
  });

  if (portal.visible) {
    const [x, y] = toMap(portal.position.x, portal.position.z);
    miniMapContext.strokeStyle = "#5db7de";
    miniMapContext.lineWidth = 3;
    miniMapContext.beginPath();
    miniMapContext.arc(x, y, 5, 0, Math.PI * 2);
    miniMapContext.stroke();
  }

  const [px, py] = toMap(avatar.position.x, avatar.position.z);
  miniMapContext.save();
  miniMapContext.translate(px, py);
  miniMapContext.rotate(Math.PI - avatar.rotation.y);
  miniMapContext.fillStyle = "#ffffff";
  miniMapContext.beginPath();
  miniMapContext.moveTo(0, -7);
  miniMapContext.lineTo(5, 5);
  miniMapContext.lineTo(-5, 5);
  miniMapContext.closePath();
  miniMapContext.fill();
  miniMapContext.restore();
}

function updateSparkles(delta) {
  for (let i = sparkles.length - 1; i >= 0; i -= 1) {
    const sparkle = sparkles[i];
    sparkle.userData.life -= delta;
    sparkle.userData.velocity.y -= 7 * delta;
    sparkle.position.addScaledVector(sparkle.userData.velocity, delta);
    sparkle.rotation.x += delta * 6;
    sparkle.rotation.y += delta * 4;
    sparkle.scale.setScalar(Math.max(sparkle.userData.life, 0.08));

    if (sparkle.userData.life <= 0) {
      scene.remove(sparkle);
      sparkles.splice(i, 1);
    }
  }
}

function updatePortal(delta) {
  lightTowerLamp.rotation.y += delta * 1.6;

  if (!portal.visible) return;

  portalRing.rotation.z += delta * 1.8;
  portalRing.material.emissiveIntensity = 0.34 + Math.sin(elapsed * 4) * 0.12;
  portalDoor.material.opacity = 0.5 + Math.sin(elapsed * 5) * 0.08;

  const portalCenter = portal.position.clone().add(new THREE.Vector3(0, 1.1, 0));
  if (avatar.position.distanceTo(portalCenter) < 1.55) {
    if (portal.userData.mode === "next" && currentLevelIndex < LEVELS.length - 1) {
      playSound("clear");
      startLevel(currentLevelIndex + 1);
    } else {
      completeGame();
    }
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function selectColor(index) {
  selectedColor = index;
  document.documentElement.style.setProperty("--selected-color", palette[selectedColor].css);
  document
    .querySelectorAll(".swatch")
    .forEach((swatch, swatchIndex) =>
      swatch.setAttribute("aria-pressed", String(swatchIndex === selectedColor))
    );
  saveGame();
}

function unlockColor(index) {
  const item = palette[index];
  if (!item || unlockedColors.has(index)) return true;
  if (!spendGold(item.cost)) {
    showMessage("골드가 조금 더 필요해요");
    return false;
  }

  unlockedColors.add(index);
  saveGame();
  buildPalette();
  playSound("shop");
  showMessage(`${item.name} 색 열림`);
  return true;
}

function buildPalette() {
  palettePanel.innerHTML = "";

  palette.forEach((item, index) => {
    const unlocked = unlockedColors.has(index);
    const button = document.createElement("button");
    button.className = `swatch${unlocked ? "" : " locked"}`;
    button.type = "button";
    button.style.background = item.css;
    button.dataset.price = unlocked ? "" : item.cost;
    button.setAttribute("aria-label", item.name);
    button.setAttribute("aria-pressed", String(index === selectedColor));
    button.title = unlocked ? item.name : `${item.name} ${item.cost} 골드`;
    button.addEventListener("click", () => {
      if (!unlockedColors.has(index) && !unlockColor(index)) return;
      selectColor(index);
    });
    palettePanel.appendChild(button);
  });

  selectColor(selectedColor);
}

function renderShop() {
  if (!shopList) return;

  shopList.innerHTML = "";
  shopItems.forEach((item) => {
    const owned = purchased.has(item.id);
    const affordable = gold >= item.cost;
    const row = document.createElement("article");
    row.className = `shopItem${owned ? " owned" : ""}${!owned && !affordable ? " locked" : ""}`;

    const icon = document.createElement("div");
    icon.className = "shopIcon";
    icon.style.background = item.swatch;

    const copy = document.createElement("div");
    copy.className = "shopCopy";
    copy.innerHTML = `<div class="shopName">${item.name}</div><div class="shopDesc">${item.description}</div>`;

    const button = document.createElement("button");
    button.className = "buyButton";
    button.type = "button";
    button.textContent = owned ? "보유" : `${item.cost} 골드`;
    button.disabled = owned || !affordable;
    button.addEventListener("click", () => {
      if (owned) return;
      if (!spendGold(item.cost)) {
        showMessage("골드가 조금 더 필요해요");
        return;
      }

      purchased.add(item.id);
      applyUpgrade(item.id);
      saveGame();
      renderShop();
      playSound("shop");
      showMessage(`${item.name} 열림`);
    });

    row.append(icon, copy, button);
    shopList.append(row);
  });
}

const avatarEditorGroups = [
  { key: "skin", title: "피부", type: "color" },
  { key: "shirt", title: "상의", type: "color" },
  { key: "pants", title: "하의", type: "color" },
  { key: "hair", title: "머리색", type: "color" },
  { key: "hairStyle", title: "머리 모양", type: "choice" },
  { key: "accessory", title: "액세서리", type: "choice" }
];

function buildAvatarEditor() {
  if (!avatarEditor) return;

  normalizeAvatarAppearance();
  avatarEditor.innerHTML = "";

  avatarEditorGroups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "editorGroup";

    const title = document.createElement("div");
    title.className = "editorTitle";
    title.textContent = group.title;

    const options = document.createElement("div");
    options.className = `optionGrid ${group.type === "color" ? "colorGrid" : "choiceGrid"}`;

    avatarOptions[group.key].forEach((option) => {
      const button = document.createElement("button");
      const active = avatarAppearance[group.key] === option.id;
      button.className = `avatarOption ${group.type === "color" ? "colorOption" : "choiceOption"}`;
      button.type = "button";
      button.dataset.avatarGroup = group.key;
      button.dataset.avatarOption = option.id;
      button.setAttribute("aria-label", `${group.title} ${option.label}`);
      button.setAttribute("aria-pressed", String(active));
      button.title = option.label;

      if (group.type === "color") {
        const swatch = document.createElement("span");
        swatch.className = "avatarSwatch";
        swatch.style.background = option.css;
        button.append(swatch);
      }

      const label = document.createElement("span");
      label.className = "avatarChoiceText";
      label.textContent = option.label;
      button.append(label);

      button.addEventListener("click", () => {
        avatarAppearance[group.key] = option.id;
        applyAvatarAppearance();
        buildAvatarEditor();
        showMessage(`${option.label} 선택`);
      });

      options.append(button);
    });

    section.append(title, options);
    avatarEditor.append(section);
  });
}

let joystickPointerId = null;

function setJoystickPosition(x, y) {
  movePad.style.setProperty("--joy-x", `${x}px`);
  movePad.style.setProperty("--joy-y", `${y}px`);
}

function updateJoystick(event) {
  const rect = movePad.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxDistance = rect.width * 0.34;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const distance = Math.hypot(rawX, rawY);
  const scale = distance > maxDistance ? maxDistance / distance : 1;
  const x = rawX * scale;
  const y = rawY * scale;
  const normalizedX = x / maxDistance;
  const normalizedY = y / maxDistance;
  const deadZone = 0.12;

  input.moveX = Math.abs(normalizedX) < deadZone ? 0 : normalizedX;
  input.moveY = Math.abs(normalizedY) < deadZone ? 0 : normalizedY;
  setJoystickPosition(x, y);
}

function resetJoystick() {
  joystickPointerId = null;
  input.moveX = 0;
  input.moveY = 0;
  movePad.classList.remove("active");
  setJoystickPosition(0, 0);
}

function bindJoystick() {
  movePad.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    joystickPointerId = event.pointerId;
    movePad.setPointerCapture(event.pointerId);
    movePad.classList.add("active");
    updateJoystick(event);
  });

  movePad.addEventListener("pointermove", (event) => {
    if (event.pointerId !== joystickPointerId) return;
    event.preventDefault();
    event.stopPropagation();
    updateJoystick(event);
  });

  const release = (event) => {
    if (event.pointerId !== joystickPointerId) return;
    event.preventDefault();
    event.stopPropagation();
    resetJoystick();
  };

  movePad.addEventListener("pointerup", release);
  movePad.addEventListener("pointercancel", release);
  movePad.addEventListener("lostpointercapture", resetJoystick);
}

function restartGame() {
  window.location.reload();
}

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
  deferredInstallPrompt = null;
  showMessage("홈 화면 준비 완료");
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

window.addEventListener("resize", resize);
window.addEventListener("pointerdown", initAudio, { once: true, capture: true });
window.addEventListener("keydown", initAudio, { once: true, capture: true });

window.addEventListener("keydown", (event) => {
  if (event.repeat && event.code !== "Space") return;

  if (event.code === "KeyW" || event.code === "ArrowUp") input.forward = true;
  if (event.code === "KeyS" || event.code === "ArrowDown") input.back = true;
  if (event.code === "KeyA" || event.code === "ArrowLeft") input.left = true;
  if (event.code === "KeyD" || event.code === "ArrowRight") input.right = true;
  if (event.code === "Space") input.jump = true;
  if (event.code === "KeyF") startAttackInput(event);
  if (event.code === "KeyR") cycleWeapon();
  if (event.code === "Digit1") setCurrentWeapon("push");
  if (event.code === "Digit2") setCurrentWeapon("bow");
  if (event.code === "Digit3") setCurrentWeapon("fireball");
  if (event.code === "KeyB") toggleBox();
  if (event.code === "KeyE") placeBlock();
  if (event.code === "KeyQ" || event.code === "Backspace") eraseBlock();
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyW" || event.code === "ArrowUp") input.forward = false;
  if (event.code === "KeyS" || event.code === "ArrowDown") input.back = false;
  if (event.code === "KeyA" || event.code === "ArrowLeft") input.left = false;
  if (event.code === "KeyD" || event.code === "ArrowRight") input.right = false;
  if (event.code === "Space") input.jump = false;
  if (event.code === "KeyF") releaseAttackInput(event);
});

canvas.addEventListener("pointerdown", (event) => {
  if (cameraPointerId !== null) return;
  if (event.pointerType === "touch" && event.clientX < window.innerWidth * 0.34) return;

  cameraPointerId = event.pointerId;
  cameraPointerType = event.pointerType || "mouse";
  lastPointer = { x: event.clientX, y: event.clientY };
  cameraFollowYawTarget = null;
  lastManualCameraAt = elapsed;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId !== cameraPointerId) return;

  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  const yawSensitivity = cameraPointerType === "touch" ? 0.0038 : 0.006;
  const pitchSensitivity = cameraPointerType === "touch" ? 0.003 : 0.0045;

  cameraYaw -= dx * yawSensitivity;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * pitchSensitivity, 0.22, 0.92);
  lastPointer = { x: event.clientX, y: event.clientY };
  cameraFollowYawTarget = null;
  lastManualCameraAt = elapsed;
});

canvas.addEventListener("pointerup", (event) => {
  if (event.pointerId !== cameraPointerId) return;
  cameraPointerId = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

canvas.addEventListener("pointercancel", (event) => {
  if (event.pointerId !== cameraPointerId) return;
  cameraPointerId = null;
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.006, 3.35, 6.4);
  },
  { passive: false }
);

jumpButton.addEventListener("click", () => {
  input.jump = true;
});
attackButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  attackButton.setPointerCapture?.(event.pointerId);
  startAttackInput(event);
});
attackButton.addEventListener("pointerup", (event) => {
  releaseAttackInput(event);
  if (attackButton.hasPointerCapture?.(event.pointerId)) attackButton.releasePointerCapture(event.pointerId);
});
attackButton.addEventListener("pointercancel", releaseAttackInput);
attackButton.addEventListener("lostpointercapture", releaseAttackInput);
weaponButton?.addEventListener("click", () => cycleWeapon());
boxButton.addEventListener("click", toggleBox);
buildButton.addEventListener("click", placeBlock);
removeButton.addEventListener("click", eraseBlock);
shopButton.addEventListener("click", () => {
  renderShop();
  avatarPanel.classList.remove("show");
  helpPanel.classList.remove("show");
  shopPanel.classList.add("show");
});
closeShopButton.addEventListener("click", () => {
  shopPanel.classList.remove("show");
});
avatarButton.addEventListener("click", () => {
  buildAvatarEditor();
  shopPanel.classList.remove("show");
  helpPanel.classList.remove("show");
  avatarPanel.classList.add("show");
});
closeAvatarButton.addEventListener("click", () => {
  avatarPanel.classList.remove("show");
});
helpButton.addEventListener("click", () => {
  shopPanel.classList.remove("show");
  avatarPanel.classList.remove("show");
  helpPanel.classList.add("show");
});
closeHelpButton.addEventListener("click", () => {
  helpPanel.classList.remove("show");
});
hideCoachButton.addEventListener("click", () => {
  controlCoach.classList.add("hide");
});
installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    showMessage("브라우저 메뉴에서 홈 화면 추가");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
  installButton.hidden = true;
});
restartButton.addEventListener("click", restartGame);

buildPalette();
bindJoystick();
updateGold();
applyAvatarAppearance(false);
buildAvatarEditor();
renderShop();
startLevel(0);

const debugEnabled = new URLSearchParams(window.location.search).has("debug");
globalThis.__hyuniGame = {
  getState: () => ({
    x: playerBody.position.x,
    y: playerBody.position.y,
    z: playerBody.position.z,
    cameraYaw,
    cameraPitch,
    cameraDistance,
    avatarYaw: avatar.rotation.y,
    avatarYawTarget,
    moveX: input.moveX,
    moveY: input.moveY,
    boxed: isBoxed,
    level: currentLevelIndex + 1,
    goalCollected: lights,
    enemiesDefeated,
    attackCooldown,
    attackRecoveryTimer,
    weapon: currentWeapon,
    bowCharging,
    bowChargePower,
    boxMotionNoise,
    limbPose: {
      leftHand: { x: leftHand.position.x, y: leftHand.position.y, z: leftHand.position.z },
      rightHand: { x: rightHand.position.x, y: rightHand.position.y, z: rightHand.position.z },
      leftArmRotation: { x: leftArm.rotation.x, y: leftArm.rotation.y, z: leftArm.rotation.z },
      rightArmRotation: { x: rightArm.rotation.x, y: rightArm.rotation.y, z: rightArm.rotation.z }
    },
    gold,
    upgrades: { ...upgrades },
    avatar: { ...avatarAppearance },
    goalItems: lightsInWorld.map((light) => ({
      x: light.position.x,
      y: light.position.y,
      z: light.position.z
    })),
    weaponPickups: weaponPickups.map((pickup) => ({
      kind: pickup.userData.kind,
      collected: pickup.userData.collected,
      x: pickup.position.x,
      z: pickup.position.z
    })),
    projectiles: projectiles.map((projectile) => ({
      kind: projectile.kind,
      charge: projectile.charge ?? 0,
      x: projectile.mesh.position.x,
      y: projectile.mesh.position.y,
      z: projectile.mesh.position.z
    })),
    bugs: bugs.map((bug) => ({
      hp: bug.userData.hp,
      x: bug.position.x,
      y: bug.position.y,
      z: bug.position.z
    })),
    blocks: Array.from(blocks.keys()).map((key) => {
      const [x, y, z] = parseKey(key);
      return { x, y, z };
    }),
    friends: friends.map((friend) => ({
      name: friend.userData.name,
      kind: friend.userData.kind,
      active: friend.userData.active,
      defeated: friend.userData.defeated,
      visible: friend.visible,
      hp: friend.userData.hp,
      boxAlarm: Math.max(0, friend.userData.boxAlarmUntil - elapsed),
      x: friend.position.x,
      y: friend.position.y,
      z: friend.position.z
    }))
  }),
  ...(debugEnabled
    ? {
        teleportTo: (x, z) => {
          playerBody.position.set(x, 2.2, z);
          playerBody.velocity.set(0, 0, 0);
          playerBody.wakeUp();
        },
        setCameraYaw: (yaw = 0) => {
          cameraYaw = Number(yaw) || 0;
        },
        placeDebugBlock: (x, y, z, colorIndex = selectedColor) => {
          const bx = Math.round(x);
          const by = Math.round(y);
          const bz = Math.round(z);
          removeBlock(bx, by, bz);
          return addBlock(bx, by, bz, colorIndex, false);
        },
        forceOpenPortal: () => {
          lights = currentLevel().goal;
          enemiesDefeated = activeEnemyGoal();
          updateLevelHud();
          checkLevelCompletion();
        },
        forceYellowCarry: () => {
          const yellow = friends.find((friend) => friend.userData.name === "노랑");
          if (yellow) {
            yellow.userData.active = true;
            yellow.userData.defeated = false;
            yellow.userData.hp = yellow.userData.maxHp;
            yellow.visible = true;
            startCarry(yellow);
          }
        },
        placeFriendNear: (name = "파랑", distance = 0.72) => {
          const friend = friends.find((item) => item.userData.name === name);
          if (!friend) return false;
          const forward = new THREE.Vector3(Math.sin(avatarYawTarget), 0, Math.cos(avatarYawTarget)).normalize();
          friend.userData.active = true;
          friend.userData.defeated = false;
          friend.userData.hp = friend.userData.maxHp;
          friend.userData.stunUntil = 0;
          friend.userData.nextAttack = 0;
          friend.visible = true;
          friend.position.set(
            playerBody.position.x + forward.x * distance,
            friend.userData.kind === "flyer" ? 0.85 : 0,
            playerBody.position.z + forward.z * distance
          );
          setFriendHealth(friend);
          return true;
        },
        forceLevel: (index) => {
          startLevel(Math.max(0, Math.min(LEVELS.length - 1, index)));
        }
      }
    : {})
};

let lastTime = performance.now() / 1000;

function updateDebugState() {
  canvas.dataset.playerX = playerBody.position.x.toFixed(3);
  canvas.dataset.playerY = playerBody.position.y.toFixed(3);
  canvas.dataset.playerZ = playerBody.position.z.toFixed(3);
  canvas.dataset.cameraYaw = cameraYaw.toFixed(3);
  canvas.dataset.cameraPitch = cameraPitch.toFixed(3);
  canvas.dataset.avatarYaw = avatar.rotation.y.toFixed(3);
  canvas.dataset.moveX = input.moveX.toFixed(3);
  canvas.dataset.moveY = input.moveY.toFixed(3);
  canvas.dataset.level = `${currentLevelIndex + 1}`;
  canvas.dataset.goalCollected = `${lights}`;
  canvas.dataset.enemiesDefeated = `${enemiesDefeated}`;
  canvas.dataset.attackCooldown = attackCooldown.toFixed(3);
  canvas.dataset.attackRecovery = attackRecoveryTimer.toFixed(3);
  canvas.dataset.weapon = currentWeapon;
  canvas.dataset.bowCharge = bowChargePower.toFixed(3);
  canvas.dataset.boxNoise = boxMotionNoise.toFixed(3);
}

function animate(nowMs) {
  const now = nowMs / 1000;
  const delta = Math.min(Math.max(0, now - lastTime), 0.05);
  lastTime = now;

  updateHud(delta);
  updateMovement(delta);
  world.step(FIXED_STEP, delta, 4);
  resolvePlayerEnvironmentCollisions();
  syncAvatar(delta);
  updateNightLighting(delta);
  updateCamera(delta);
  updateTreeOcclusion(delta);
  updateLights(delta);
  updateFriends(delta);
  updateBugs(delta);
  updateTrail(delta);
  updateGuide(delta);
  updateWeaponPickups(delta);
  updateSafeZones(delta);
  updateMiniMap();
  updateProjectiles(delta);
  updateSparkles(delta);
  updatePortal(delta);
  updateDebugState();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

syncAvatar();
updateNightLighting(0);
updateCamera(1);
updateMiniMap();
updateDebugState();
requestAnimationFrame(animate);
