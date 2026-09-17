/**
 * Three.js 3D renderer — daylight city endless runner (RUSH HOUR).
 */
import * as THREE from '../vendor/three.module.js';
import { LANES } from './entities.js';

/**
 * Subway Surfers–style runner (stylized human, not a box).
 * Always sprints AWAY from the chase cam into +Z.
 *
 * World: +Z run dir, −Z toward camera, +X right, +Y up.
 * Local: chest/face/toes → +Z; backpack/hair → −Z (what the cam sees).
 */
function markMeshes(obj, { cast = false, receive = false } = {}) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

function makeHumanoid({ body, accent, skin, scale = 1, isCop = false }) {
  const s = scale;
  const root = new THREE.Group();
  root.rotation.set(0, 0, 0);

  const matHoodie = new THREE.MeshStandardMaterial({
    color: body,
    roughness: 0.62,
    metalness: 0.08,
  });
  const matPants = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.7,
    metalness: 0.05,
  });
  const matSkin = new THREE.MeshStandardMaterial({
    color: skin,
    roughness: 0.55,
    metalness: 0.02,
  });
  const matHair = new THREE.MeshStandardMaterial({
    color: isCop ? 0x1a1a22 : 0x2a1810,
    roughness: 0.9,
  });
  const matPack = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.45,
    metalness: 0.2,
  });
  const matShoe = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.55,
    metalness: 0.15,
  });
  const matSole = new THREE.MeshStandardMaterial({
    color: body,
    roughness: 0.5,
    emissive: body,
    emissiveIntensity: 0.15,
  });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

  // —— Pelvis / hips (connects legs to torso) ——
  const hips = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 * s, 12, 10),
    matPants
  );
  hips.position.set(0, 0.92 * s, 0);
  hips.scale.set(1.35, 0.75, 0.95);
  root.add(hips);

  // —— Torso group (hoodie + pack animate together) ——
  const torso = new THREE.Group();
  torso.position.set(0, 1.12 * s, 0);
  root.add(torso);

  // Main chest — rounded capsule, wider on X so rear view shows a real back
  const chest = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2 * s, 0.28 * s, 6, 12),
    matHoodie
  );
  chest.scale.set(1.35, 1, 0.85);
  torso.add(chest);

  // Hoodie belly / lower torso flare
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.2 * s, 12, 10),
    matHoodie
  );
  belly.position.set(0, -0.22 * s, 0.02 * s);
  belly.scale.set(1.4, 0.7, 0.95);
  torso.add(belly);

  // Hood resting on upper back (−Z) — classic SS silhouette from chase cam
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.18 * s, 12, 10),
    matHoodie
  );
  hood.position.set(0, 0.28 * s, -0.14 * s);
  hood.scale.set(1.15, 0.7, 0.85);
  torso.add(hood);

  // Drawstring / collar ring
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.12 * s, 0.025 * s, 8, 16),
    matDark
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.32 * s, 0.02 * s);
  torso.add(collar);

  // Backpack (large, clearly on the back facing the camera)
  const pack = new THREE.Group();
  pack.position.set(0, 0.02 * s, -0.28 * s);
  torso.add(pack);
  const packBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.38 * s, 0.42 * s, 0.22 * s),
    matPack
  );
  packBody.position.y = 0.02 * s;
  pack.add(packBody);
  // Rounded top of pack
  const packTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 * s, 10, 8),
    matPack
  );
  packTop.position.set(0, 0.22 * s, 0);
  packTop.scale.set(1.15, 0.55, 0.9);
  pack.add(packTop);
  // Side pockets
  for (const sx of [-1, 1]) {
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * s, 0.18 * s, 0.12 * s),
      matDark
    );
    pocket.position.set(sx * 0.22 * s, -0.05 * s, 0);
    pack.add(pocket);
  }
  // Strap highlights
  for (const sx of [-1, 1]) {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.06 * s, 0.35 * s, 0.03 * s),
      matWhite
    );
    strap.position.set(sx * 0.12 * s, 0.08 * s, 0.12 * s);
    pack.add(strap);
  }

  // —— Neck + head ——
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.12 * s, 10),
    matSkin
  );
  neck.position.set(0, 0.42 * s, 0.02 * s);
  torso.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.58 * s, 0.04 * s);
  torso.add(head);

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.175 * s, 16, 14),
    matSkin
  );
  skull.scale.set(1, 1.08, 0.95);
  head.add(skull);

  // Ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 * s, 8, 6),
      matSkin
    );
    ear.position.set(sx * 0.17 * s, 0, 0);
    ear.scale.set(0.55, 1, 0.7);
    head.add(ear);
  }

  // Hair cap (volume on top + back for rear view)
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.185 * s, 14, 12),
    matHair
  );
  hair.position.set(0, 0.06 * s, -0.03 * s);
  hair.scale.set(1.05, 0.78, 1.12);
  head.add(hair);
  // Back hair bulk
  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.12 * s, 10, 8),
    matHair
  );
  hairBack.position.set(0, -0.02 * s, -0.12 * s);
  hairBack.scale.set(1.1, 0.9, 0.8);
  head.add(hairBack);

  // Face (front = +Z; mostly hidden from chase cam, still there for side views)
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.4 });
  const eyeIris = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 8, 6), eyeWhite);
    white.position.set(sx * 0.06 * s, 0.02 * s, 0.155 * s);
    white.scale.set(1, 0.85, 0.5);
    head.add(white);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.018 * s, 8, 6), eyeIris);
    iris.position.set(sx * 0.06 * s, 0.02 * s, 0.175 * s);
    head.add(iris);
  }
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.03 * s, 8, 6),
    matSkin
  );
  nose.position.set(0, -0.02 * s, 0.175 * s);
  nose.scale.set(0.7, 0.9, 1.1);
  head.add(nose);
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.06 * s, 0.015 * s, 0.02 * s),
    new THREE.MeshStandardMaterial({ color: 0x8b3a3a, roughness: 0.6 })
  );
  mouth.position.set(0, -0.08 * s, 0.16 * s);
  head.add(mouth);

  // —— Legs with upper + lower segments (knees) ——
  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.12 * s, 0.9 * s, 0);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.085 * s, 0.28 * s, 4, 10),
      matPants
    );
    thigh.position.y = -0.2 * s;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.4 * s;
    hip.add(knee);

    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07 * s, 0.26 * s, 4, 10),
      matPants
    );
    shin.position.y = -0.18 * s;
    knee.add(shin);

    // Sneaker
    const shoe = new THREE.Group();
    shoe.position.set(0, -0.38 * s, 0.06 * s);
    knee.add(shoe);
    const shoeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * s, 0.09 * s, 0.28 * s),
      matShoe
    );
    shoe.add(shoeBody);
    const toe = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 * s, 8, 6),
      matShoe
    );
    toe.position.set(0, -0.01 * s, 0.12 * s);
    toe.scale.set(1, 0.7, 0.9);
    shoe.add(toe);
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.15 * s, 0.03 * s, 0.3 * s),
      matSole
    );
    sole.position.set(0, -0.055 * s, 0.02 * s);
    shoe.add(sole);
    // Laces stripe
    const lace = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * s, 0.02 * s, 0.12 * s),
      matWhite
    );
    lace.position.set(0, 0.04 * s, 0.04 * s);
    shoe.add(lace);

    return { hip, knee };
  }

  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  root.add(legL.hip, legR.hip);

  // —— Arms with upper + forearm + hand ——
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.32 * s, 0.28 * s, 0);
    torso.add(shoulder);

    const shoulderBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 * s, 10, 8),
      matHoodie
    );
    shoulder.add(shoulderBall);

    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055 * s, 0.2 * s, 4, 8),
      matHoodie
    );
    upper.position.y = -0.16 * s;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.32 * s;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045 * s, 0.18 * s, 4, 8),
      matSkin
    );
    forearm.position.y = -0.14 * s;
    elbow.add(forearm);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.055 * s, 8, 6),
      matSkin
    );
    hand.position.y = -0.3 * s;
    hand.scale.set(1, 0.85, 1.15);
    elbow.add(hand);

    return { shoulder, elbow };
  }

  const armL = makeArm(-1);
  const armR = makeArm(1);

  markMeshes(root);
  root.userData = {
    legL: legL.hip,
    legR: legR.hip,
    kneeL: legL.knee,
    kneeR: legR.knee,
    armL: armL.shoulder,
    armR: armR.shoulder,
    elbowL: armL.elbow,
    elbowR: armR.elbow,
    torso,
    head,
    pack,
    hips,
  };
  return root;
}

function makeCop() {
  const g = makeHumanoid({
    body: 0x1e3a5f,
    accent: 0x0f2744,
    skin: 0xe8c4a2,
    scale: 1.05,
    isCop: true,
  });

  // Police cap
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.21, 0.1, 14),
    new THREE.MeshStandardMaterial({ color: 0x0f2744, roughness: 0.55 })
  );
  cap.position.set(0, 1.78, 0.02);
  g.add(cap);
  const bill = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.03, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x0a1a30 })
  );
  bill.position.set(0, 1.74, 0.16);
  g.add(bill);
  // Cap badge
  const capBadge = new THREE.Mesh(
    new THREE.CircleGeometry(0.04, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffd56a,
      emissive: 0xaa8800,
      emissiveIntensity: 0.5,
    })
  );
  capBadge.position.set(0, 1.8, 0.12);
  g.add(capBadge);

  g.userData.siren = capBadge.material;

  const badge = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffd56a,
      emissive: 0xaa8800,
      emissiveIntensity: 0.45,
    })
  );
  badge.position.set(0.12, 1.22, 0.18);
  g.add(badge);

  // Duty vest + belt — reads as a real officer from the chase cam
  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.42, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x1a3658, roughness: 0.62, metalness: 0.08 })
  );
  vest.position.set(0, 1.28, 0.02);
  g.add(vest);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.06, 0.34),
    new THREE.MeshStandardMaterial({
      color: 0xf0d040,
      emissive: 0xaa8800,
      emissiveIntensity: 0.35,
      roughness: 0.45,
    })
  );
  stripe.position.set(0, 1.18, 0.02);
  g.add(stripe);
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.08, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.2 })
  );
  belt.position.set(0, 1.02, 0);
  g.add(belt);
  const radio = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.14, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4, metalness: 0.35 })
  );
  radio.position.set(0.22, 1.42, -0.12);
  g.add(radio);

  markMeshes(g);
  return g;
}

function makePoliceCruiser() {
  const g = makeCarMesh('sedan');
  paintCar(g, 0xf4f4f6);
  const bar = new THREE.Group();
  bar.position.set(0, 1.62, 0.15);
  g.add(bar);
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.12, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.4, metalness: 0.3 })
  );
  bar.add(housing);
  const matRed = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const matBlue = new THREE.MeshStandardMaterial({
    color: 0x2244ff,
    emissive: 0x1133ff,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.28), matRed);
  left.position.x = -0.28;
  bar.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.28), matBlue);
  right.position.x = 0.28;
  bar.add(right);
  // Dark hood stripe / push bumper
  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.18, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.55, metalness: 0.25 })
  );
  bumper.position.set(0, 0.38, -2.2);
  g.add(bumper);
  g.userData.lightRed = matRed;
  g.userData.lightBlue = matBlue;
  markMeshes(g, { cast: true });
  bindCarParts(g);
  return g;
}

function makeEnvMap() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, '#6a9cc8');
  g.addColorStop(0.45, '#c8d8e8');
  g.addColorStop(0.62, '#e8c090');
  g.addColorStop(1, '#5a5850');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function carPaintMat(color) {
  const env = shared().envMap;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.28,
    metalness: 0.62,
    envMap: env,
    envMapIntensity: 0.85,
  });
}

function bindCarParts(root) {
  const wheels = [];
  root.traverse((o) => {
    if (o.name === 'carWheel') wheels.push(o);
  });
  root.userData.wheels = wheels;
}

function paintCar(root, hex) {
  if (hex == null) return;
  let shared = root.userData.paintMat;
  if (!shared) {
    root.traverse((o) => {
      if (!shared && o.name === 'carBody' && o.material) shared = o.material.clone();
    });
    root.userData.paintMat = shared;
  }
  if (!shared) return;
  shared.color.setHex(hex);
  root.traverse((o) => {
    if (o.name === 'carBody') o.material = shared;
  });
}

function carVisual(style) {
  if (style === 'hatch') {
    return {
      w: 1.62, d: 3.85, wheelR: 0.30, wheelW: 0.20, wheelbase: 2.42, track: 1.38,
      ride: 0.14, lowerH: 0.50, hoodLen: 1.02, hoodH: 0.17,
      cabinLen: 1.88, cabinH: 0.52, trunkLen: 0.48, trunkH: 0.20, hatch: true,
    };
  }
  if (style === 'sports') {
    return {
      w: 1.78, d: 4.35, wheelR: 0.32, wheelW: 0.24, wheelbase: 2.52, track: 1.54,
      ride: 0.11, lowerH: 0.40, hoodLen: 1.42, hoodH: 0.13,
      cabinLen: 1.32, cabinH: 0.38, trunkLen: 0.82, trunkH: 0.20, spoiler: true, low: true,
    };
  }
  if (style === 'suv') {
    return {
      w: 1.88, d: 4.70, wheelR: 0.38, wheelW: 0.24, wheelbase: 2.78, track: 1.58,
      ride: 0.20, lowerH: 0.68, hoodLen: 1.08, hoodH: 0.22,
      cabinLen: 2.18, cabinH: 0.70, trunkLen: 0.68, trunkH: 0.48, rails: true, boxy: true,
    };
  }
  if (style === 'pickup') {
    return {
      w: 1.80, d: 5.20, wheelR: 0.36, wheelW: 0.24, wheelbase: 3.18, track: 1.52,
      ride: 0.18, lowerH: 0.60, hoodLen: 1.18, hoodH: 0.20,
      cabinLen: 1.32, cabinH: 0.60, trunkLen: 1.90, trunkH: 0.40, bed: true,
    };
  }
  if (style === 'taxi') {
    return {
      w: 1.74, d: 4.55, wheelR: 0.33, wheelW: 0.22, wheelbase: 2.70, track: 1.46,
      ride: 0.15, lowerH: 0.56, hoodLen: 1.20, hoodH: 0.20,
      cabinLen: 1.62, cabinH: 0.56, trunkLen: 0.98, trunkH: 0.34, taxi: true,
    };
  }
  if (style === 'van') {
    return {
      w: 1.92, d: 5.15, wheelR: 0.36, wheelW: 0.24, wheelbase: 3.05, track: 1.62,
      ride: 0.18, lowerH: 0.78, hoodLen: 0.85, hoodH: 0.22,
      cabinLen: 3.55, cabinH: 0.92, trunkLen: 0.35, trunkH: 0.55, boxy: true, van: true,
    };
  }
  if (style === 'bus') {
    return {
      w: 2.48, d: 10.8, wheelR: 0.52, wheelW: 0.28, wheelbase: 6.4, track: 2.05,
      ride: 0.22, lowerH: 1.05, hoodLen: 0.55, hoodH: 0.18,
      cabinLen: 9.6, cabinH: 1.72, trunkLen: 0.28, trunkH: 0.4, boxy: true, bus: true,
    };
  }
  return {
    w: 1.74, d: 4.55, wheelR: 0.33, wheelW: 0.22, wheelbase: 2.70, track: 1.46,
    ride: 0.15, lowerH: 0.56, hoodLen: 1.22, hoodH: 0.20,
    cabinLen: 1.62, cabinH: 0.54, trunkLen: 0.98, trunkH: 0.34,
  };
}

function makeWheel(radius, width, matTire, matRim, matHub) {
  const g = new THREE.Group();
  g.name = 'carWheel';
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), matTire);
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  const sidewall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, width + 0.02, 16),
    matTire
  );
  sidewall.rotation.z = Math.PI / 2;
  g.add(sidewall);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.62, width * 0.55, 16),
    matRim
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, radius * 0.92, 0.045), matRim);
    spoke.rotation.x = (i / 5) * Math.PI;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, width * 0.7, 10), matHub);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.14, 10), matHub);
  cap.rotation.y = Math.PI / 2;
  cap.position.x = width * 0.38;
  g.add(cap);
  const cap2 = cap.clone();
  cap2.rotation.y = -Math.PI / 2;
  cap2.position.x = -width * 0.38;
  g.add(cap2);
  return g;
}

/**
 * Oncoming street car. Local front (grille, headlights) faces −Z so the chase
 * cam sees the face of traffic coming at the runner.
 */
function makeCarMesh(style) {
  const cfg = carVisual(style);
  const g = new THREE.Group();
  const w = cfg.w;
  const d = cfg.d;
  const half = d / 2;
  const ride = cfg.ride;
  const lowerH = cfg.lowerH;
  const lowerY = ride + lowerH / 2;
  const bumperD = 0.24;

  const matBody = carPaintMat(0xb8bec4);
  const matTrim = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.55, metalness: 0.25 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xc8cdd2, roughness: 0.18, metalness: 0.92 });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x1a2836,
    roughness: 0.12,
    metalness: 0.72,
  });
  const matTire = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.92, metalness: 0.04 });
  const matRim = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.28, metalness: 0.82 });
  const matHub = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 });
  const matHead = new THREE.MeshStandardMaterial({
    color: 0xfff6d8,
    emissive: 0xfff2c4,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    metalness: 0.3,
  });
  const matFog = new THREE.MeshStandardMaterial({
    color: 0xffe8a0,
    emissive: 0xffcc66,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  const matTail = new THREE.MeshStandardMaterial({
    color: 0xff1a1a,
    emissive: 0xff0000,
    emissiveIntensity: 0.85,
    roughness: 0.35,
  });
  const matAmber = new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    emissive: 0xff8800,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.7, metalness: 0.2 });
  const matPlate = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.55, metalness: 0.15 });
  const matInterior = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.85 });

  const addBody = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, matBody);
    m.position.set(x, y, z);
    m.name = 'carBody';
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // —— Chassis / lower body ——
  addBody(new THREE.BoxGeometry(w, lowerH, d - bumperD * 1.6), 0, lowerY, 0);

  // Side skirts
  addBody(new THREE.BoxGeometry(0.06, lowerH * 0.35, d * 0.55), w / 2 + 0.02, ride + lowerH * 0.28, 0);
  addBody(new THREE.BoxGeometry(0.06, lowerH * 0.35, d * 0.55), -w / 2 - 0.02, ride + lowerH * 0.28, 0);

  // Front bumper (−Z)
  const frontZ = -half + bumperD * 0.45;
  addBody(new THREE.BoxGeometry(w * 0.98, lowerH * 0.55, bumperD), 0, ride + lowerH * 0.32, frontZ);
  add(new THREE.BoxGeometry(w * 0.72, 0.08, 0.1), matDark, 0, ride + 0.08, frontZ - 0.08);

  // Rear bumper (+Z)
  const rearZ = half - bumperD * 0.45;
  addBody(new THREE.BoxGeometry(w * 0.98, lowerH * 0.5, bumperD), 0, ride + lowerH * 0.3, rearZ);

  // Hood
  const hoodZ = -half + bumperD + cfg.hoodLen * 0.5;
  const hoodY = ride + lowerH + cfg.hoodH * 0.35;
  const hood = addBody(new THREE.BoxGeometry(w * 0.92, cfg.hoodH, cfg.hoodLen), 0, hoodY, hoodZ);
  hood.rotation.x = cfg.low ? 0.12 : 0.07;

  // Cabin greenhouse
  const cabinZ = -half + bumperD + cfg.hoodLen + cfg.cabinLen * 0.5;
  const cabinY = ride + lowerH + cfg.cabinH * 0.5;
  const cabinW = w * (cfg.boxy ? 0.92 : 0.82);
  addBody(new THREE.BoxGeometry(cabinW, cfg.cabinH, cfg.cabinLen), 0, cabinY, cabinZ);
  // Roof cap
  addBody(
    new THREE.BoxGeometry(cabinW * 0.96, 0.07, cfg.cabinLen * (cfg.hatch ? 0.92 : 0.78)),
    0,
    ride + lowerH + cfg.cabinH + 0.02,
    cabinZ + (cfg.hatch ? cfg.cabinLen * 0.04 : 0)
  );

  // Interior block (reads through glass as seats/dash)
  add(
    new THREE.BoxGeometry(cabinW * 0.72, cfg.cabinH * 0.45, cfg.cabinLen * 0.7),
    matInterior,
    0,
    cabinY - 0.04,
    cabinZ
  );

  // Windshield (front of cabin, tilted)
  const wind = add(
    new THREE.BoxGeometry(cabinW * 0.9, cfg.cabinH * 0.88, 0.05),
    matGlass,
    0,
    cabinY + 0.02,
    cabinZ - cfg.cabinLen * 0.48
  );
  wind.rotation.x = cfg.low ? 0.72 : cfg.boxy ? 0.28 : 0.55;

  // Rear glass
  const rearGlass = add(
    new THREE.BoxGeometry(cabinW * 0.88, cfg.cabinH * (cfg.hatch ? 0.95 : 0.72), 0.05),
    matGlass,
    0,
    cabinY + (cfg.hatch ? 0.02 : 0.06),
    cabinZ + cfg.cabinLen * 0.48
  );
  rearGlass.rotation.x = cfg.hatch ? -0.55 : cfg.boxy ? -0.12 : -0.35;

  // Side windows
  for (const sx of [-1, 1]) {
    add(
      new THREE.BoxGeometry(0.04, cfg.cabinH * 0.62, cfg.cabinLen * 0.72),
      matGlass,
      sx * (cabinW / 2 + 0.01),
      cabinY + 0.04,
      cabinZ
    );
  }

  // Trunk or pickup bed
  const trunkZ = -half + bumperD + cfg.hoodLen + cfg.cabinLen + cfg.trunkLen * 0.5;
  const trunkY = ride + lowerH * 0.55 + cfg.trunkH * 0.5;
  if (cfg.bed) {
    const bedW = w * 0.9;
    const bedH = cfg.trunkH;
    const bedD = cfg.trunkLen * 0.92;
    add(new THREE.BoxGeometry(bedW, 0.06, bedD), matTrim, 0, ride + lowerH * 0.42, trunkZ);
    addBody(new THREE.BoxGeometry(0.07, bedH, bedD), bedW / 2, ride + lowerH * 0.42 + bedH / 2, trunkZ);
    addBody(new THREE.BoxGeometry(0.07, bedH, bedD), -bedW / 2, ride + lowerH * 0.42 + bedH / 2, trunkZ);
    addBody(new THREE.BoxGeometry(bedW, bedH, 0.07), 0, ride + lowerH * 0.42 + bedH / 2, trunkZ + bedD / 2);
    addBody(new THREE.BoxGeometry(bedW, bedH, 0.07), 0, ride + lowerH * 0.42 + bedH / 2, trunkZ - bedD / 2);
  } else if (!cfg.hatch) {
    addBody(new THREE.BoxGeometry(w * 0.9, cfg.trunkH, cfg.trunkLen), 0, trunkY, trunkZ);
  }

  // Grille
  add(new THREE.BoxGeometry(w * 0.42, lowerH * 0.32, 0.06), matDark, 0, ride + lowerH * 0.55, -half + 0.04);
  add(new THREE.BoxGeometry(w * 0.38, 0.03, 0.07), matChrome, 0, ride + lowerH * 0.7, -half + 0.05);
  add(new THREE.BoxGeometry(w * 0.38, 0.03, 0.07), matChrome, 0, ride + lowerH * 0.4, -half + 0.05);

  // Headlights — facing the chase cam
  const lightY = ride + lowerH * 0.62;
  const lightZ = -half + 0.02;
  for (const sx of [-1, 1]) {
    const lamp = add(
      new THREE.BoxGeometry(0.32, 0.16, 0.08),
      matHead,
      sx * w * 0.32,
      lightY,
      lightZ
    );
    lamp.scale.set(1, cfg.low ? 0.75 : 1, 1);
    add(new THREE.BoxGeometry(0.36, 0.2, 0.04), matChrome, sx * w * 0.32, lightY, lightZ + 0.04);
    add(new THREE.BoxGeometry(0.14, 0.08, 0.06), matFog, sx * w * 0.28, ride + lowerH * 0.28, lightZ);
    add(new THREE.BoxGeometry(0.1, 0.08, 0.06), matAmber, sx * (w * 0.44), lightY, lightZ);
  }
  // Daytime running light strip
  add(new THREE.BoxGeometry(w * 0.78, 0.03, 0.04), matHead, 0, ride + lowerH * 0.82, -half + 0.03);

  // Taillights
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.34, 0.14, 0.07), matTail, sx * w * 0.32, ride + lowerH * 0.7, half - 0.02);
    add(new THREE.BoxGeometry(0.12, 0.08, 0.06), matAmber, sx * w * 0.44, ride + lowerH * 0.7, half - 0.02);
  }

  // Plates
  add(new THREE.BoxGeometry(0.36, 0.12, 0.02), matPlate, 0, ride + lowerH * 0.38, -half + 0.01);
  add(new THREE.BoxGeometry(0.36, 0.12, 0.02), matPlate, 0, ride + lowerH * 0.38, half - 0.01);

  // Side mirrors
  for (const sx of [-1, 1]) {
    const mir = add(
      new THREE.BoxGeometry(0.16, 0.1, 0.18),
      matBody,
      sx * (w * 0.52),
      ride + lowerH + 0.12,
      cabinZ - cfg.cabinLen * 0.38
    );
    mir.name = 'carBody';
    add(
      new THREE.BoxGeometry(0.02, 0.08, 0.14),
      matGlass,
      sx * (w * 0.52 + 0.08),
      ride + lowerH + 0.12,
      cabinZ - cfg.cabinLen * 0.38
    );
  }

  // Door lines
  for (const sx of [-1, 1]) {
    add(
      new THREE.BoxGeometry(0.02, lowerH * 0.7, 0.02),
      matTrim,
      sx * (w / 2 + 0.01),
      lowerY,
      cabinZ - 0.15
    );
    add(
      new THREE.BoxGeometry(0.08, 0.03, 0.12),
      matChrome,
      sx * (w / 2 + 0.01),
      ride + lowerH * 0.72,
      cabinZ - 0.05
    );
  }

  // Exhaust
  add(new THREE.CylinderGeometry(0.045, 0.05, 0.18, 8), matChrome, w * 0.28, ride + 0.12, half - 0.08).rotation.x =
    Math.PI / 2;
  if (cfg.low) {
    add(new THREE.CylinderGeometry(0.045, 0.05, 0.18, 8), matChrome, -w * 0.28, ride + 0.12, half - 0.08).rotation.x =
      Math.PI / 2;
  }

  if (cfg.spoiler) {
    addBody(new THREE.BoxGeometry(w * 0.78, 0.05, 0.28), 0, ride + lowerH + cfg.cabinH + 0.12, half - 0.45);
    add(new THREE.BoxGeometry(0.05, 0.16, 0.05), matTrim, w * 0.28, ride + lowerH + cfg.cabinH + 0.04, half - 0.45);
    add(new THREE.BoxGeometry(0.05, 0.16, 0.05), matTrim, -w * 0.28, ride + lowerH + cfg.cabinH + 0.04, half - 0.45);
  }

  if (cfg.rails) {
    for (const sx of [-1, 1]) {
      add(
        new THREE.BoxGeometry(0.05, 0.05, cfg.cabinLen * 0.7),
        matTrim,
        sx * cabinW * 0.32,
        ride + lowerH + cfg.cabinH + 0.08,
        cabinZ
      );
    }
  }

  if (cfg.taxi) {
    const lamp = add(new THREE.BoxGeometry(0.42, 0.14, 0.22), matAmber, 0, ride + lowerH + cfg.cabinH + 0.12, cabinZ);
    lamp.material = new THREE.MeshStandardMaterial({
      color: 0xf0c400,
      emissive: 0xcc9900,
      emissiveIntensity: 0.55,
      roughness: 0.45,
    });
    for (const sx of [-1, 1]) {
      for (let i = -2; i <= 2; i++) {
        add(
          new THREE.BoxGeometry(0.1, 0.16, 0.08),
          i % 2 === 0 ? matDark : matAmber,
          sx * (w / 2 + 0.02),
          ride + lowerH * 0.7,
          cabinZ + i * 0.16
        );
      }
    }
  }

  if (cfg.bus) {
    const dest = add(
      new THREE.BoxGeometry(cabinW * 0.7, 0.22, 0.06),
      matAmber,
      0,
      ride + lowerH + cfg.cabinH + 0.08,
      cabinZ - cfg.cabinLen * 0.48
    );
    dest.material = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0xffaa33,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    });
    for (let i = 0; i < 6; i++) {
      add(
        new THREE.BoxGeometry(0.04, cfg.cabinH * 0.55, 0.7),
        matGlass,
        w * 0.48,
        cabinY + 0.06,
        -half + 1.6 + i * 1.45
      );
    }
  }

  // Antenna
  if (!cfg.low) {
    add(
      new THREE.CylinderGeometry(0.012, 0.016, 0.42, 5),
      matTrim,
      w * 0.22,
      ride + lowerH + cfg.cabinH + 0.22,
      cabinZ + cfg.cabinLen * 0.2
    );
  }

  // Wheels — front pair toward −Z
  const zFront = -cfg.wheelbase / 2;
  const zRear = cfg.wheelbase / 2;
  for (const [sx, sz] of [
    [-1, zFront],
    [1, zFront],
    [-1, zRear],
    [1, zRear],
  ]) {
    const wheel = makeWheel(cfg.wheelR, cfg.wheelW, matTire, matRim, matHub);
    wheel.position.set(sx * (cfg.track / 2), cfg.wheelR, sz);
    g.add(wheel);
  }

  // Ground shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(w * 0.55, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.32, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, 0);
  shadow.scale.set(1, d * 0.28, 1);
  g.add(shadow);

  markMeshes(g, { cast: true });
  bindCarParts(g);
  return g;
}

/** High-visibility daylight obstacles — saturated colors so they read in sun and haze. */
function makeObstacleMesh(e) {
  if (e.kind === 'car') return makeCarMesh(e.style);
  const g = new THREE.Group();

  if (e.kind === 'crate') {
    const wood = new THREE.MeshStandardMaterial({
      color: 0xc4782a,
      roughness: 0.75,
      metalness: 0.05,
      emissive: 0x5a3010,
      emissiveIntensity: 0.35,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(e.w, e.h, e.d), wood);
    box.position.y = e.h / 2;
    g.add(box);
    // Cross planks for readability
    const plankMat = new THREE.MeshStandardMaterial({
      color: 0x5c3310,
      roughness: 0.8,
      emissive: 0x2a1508,
      emissiveIntensity: 0.2,
    });
    const cross = new THREE.Mesh(new THREE.BoxGeometry(e.w * 1.02, 0.08, 0.08), plankMat);
    cross.position.set(0, e.h * 0.55, e.d / 2 + 0.02);
    g.add(cross);
    const cross2 = cross.clone();
    cross2.rotation.z = Math.PI / 2;
    cross2.scale.set(e.h / e.w, 1, 1);
    g.add(cross2);
    // Warning stripe on top
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(e.w * 0.9, 0.04, e.d * 0.9),
      new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.55,
      })
    );
    stripe.position.y = e.h + 0.02;
    g.add(stripe);
  } else if (e.kind === 'barrier') {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.4,
      emissive: 0x888888,
      emissiveIntensity: 0.25,
    });
    for (const sx of [-e.w * 0.42, e.w * 0.42]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, e.h, 8), postMat);
      post.position.set(sx, e.h / 2, 0);
      g.add(post);
    }
    for (let i = 0; i < 4; i++) {
      const red = i % 2 === 0;
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(e.w, 0.16, 0.14),
        new THREE.MeshStandardMaterial({
          color: red ? 0xff2222 : 0xfff8e7,
          roughness: 0.45,
          emissive: red ? 0xaa0000 : 0x665522,
          emissiveIntensity: red ? 0.55 : 0.3,
        })
      );
      bar.position.y = 0.28 + i * 0.28;
      g.add(bar);
    }
  } else if (e.kind === 'cone') {
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xff5a00,
      roughness: 0.45,
      metalness: 0.05,
      emissive: 0xff3300,
      emissiveIntensity: 0.45,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(e.w * 0.42, e.h, 8), coneMat);
    cone.position.y = e.h / 2;
    g.add(cone);
    // White reflective bands
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      emissive: 0xffffff,
      emissiveIntensity: 0.4,
    });
    for (const t of [0.35, 0.55]) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(e.w * 0.42 * (1 - t * 0.85), e.w * 0.42 * (1 - t * 0.85) * 0.92, 0.07, 12),
        bandMat
      );
      band.position.y = e.h * t;
      g.add(band);
    }
    // Base plate
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(e.w * 0.5, e.w * 0.5, 0.06, 12),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.7,
        emissive: 0x111111,
        emissiveIntensity: 0.15,
      })
    );
    base.position.y = 0.03;
    g.add(base);
  } else {
    // Overhead hanging sign — bright red danger panel
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(e.w, e.h, e.d),
      new THREE.MeshStandardMaterial({
        color: 0xff1a1a,
        roughness: 0.4,
        metalness: 0.1,
        emissive: 0xcc0000,
        emissiveIntensity: 0.65,
      })
    );
    board.position.y = e.y + e.h / 2;
    g.add(board);
    // Diagonal hazard stripes
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffee00,
      emissive: 0xffcc00,
      emissiveIntensity: 0.7,
      roughness: 0.35,
    });
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, e.h * 0.92, 0.03), stripeMat);
      stripe.position.set(i * 0.28, e.y + e.h / 2, e.d / 2 + 0.02);
      stripe.rotation.z = 0.4;
      g.add(stripe);
    }
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      metalness: 0.5,
      roughness: 0.35,
      emissive: 0x334455,
      emissiveIntensity: 0.2,
    });
    for (const sx of [-e.w * 0.42, e.w * 0.42]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, e.y + e.h + 0.15, 8),
        poleMat
      );
      pole.position.set(sx, (e.y + e.h) / 2, 0);
      g.add(pole);
    }
  }

  markMeshes(g, { cast: true });
  return g;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexCss(n) {
  return `#${n.toString(16).padStart(6, '0')}`;
}

const BUILDING_PALETTES = [
  { wall: 0xd8c8aa, trim: 0xb8a07c, accent: 0x8a6a48, glass: 0x7eb8d8, awning: 0xc43a32, roof: 0x6a6560 },
  { wall: 0xc46a4e, trim: 0xa05038, accent: 0x6e3424, glass: 0x88c4dc, awning: 0x2a6a9a, roof: 0x5a5048 },
  { wall: 0xb0b8c0, trim: 0x8a949e, accent: 0x5a646e, glass: 0x5aa0c4, awning: 0xd05030, roof: 0x4a5058 },
  { wall: 0xeee4d2, trim: 0xc8b89a, accent: 0x9a8868, glass: 0x90c8e4, awning: 0xe07020, roof: 0x7a746c },
  { wall: 0x6a7c8c, trim: 0x4a5a68, accent: 0x2c3c4a, glass: 0x4a98c0, awning: 0xc8a040, roof: 0x3a4248 },
  { wall: 0xc8a888, trim: 0xa88868, accent: 0x705438, glass: 0x80bcd4, awning: 0x387058, roof: 0x5c5044 },
  { wall: 0x8ea090, trim: 0x6a7c6c, accent: 0x445448, glass: 0x78b4cc, awning: 0xb83838, roof: 0x4e564e },
  { wall: 0xd2b48c, trim: 0xb08a62, accent: 0x7a5638, glass: 0x6aaccc, awning: 0x305888, roof: 0x62584c },
];

const facadeCache = new Map();

/** Shared GPU resources — creating a unique geometry/material per mesh is a major lag source. */
const SHARED = { ready: false };

function shared() {
  if (SHARED.ready) return SHARED;
  SHARED.unitBox = new THREE.BoxGeometry(1, 1, 1);
  SHARED.coin = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 10);
  SHARED.coinMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0xffaa00,
    emissiveIntensity: 0.55,
  });
  SHARED.particle = new THREE.SphereGeometry(0.08, 5, 4);
  SHARED.dash = new THREE.BoxGeometry(0.14, 0.015, 3.0);
  SHARED.dashMat = new THREE.MeshLambertMaterial({
    color: 0xf2f0e4,
    emissive: 0x333028,
    emissiveIntensity: 0.08,
  });
  SHARED.blob = new THREE.CircleGeometry(0.48, 10);
  SHARED.blobMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    opacity: 0.38,
    transparent: true,
    depthWrite: false,
  });
  SHARED.envMap = makeEnvMap();
  SHARED.trunk = new THREE.CylinderGeometry(0.11, 0.16, 1.6, 6);
  SHARED.foliage = new THREE.SphereGeometry(0.85, 8, 6);
  SHARED.cloud = new THREE.SphereGeometry(1, 8, 6);
  SHARED.ready = true;
  return SHARED;
}

function noiseCanvas(size, baseR, baseG, baseB, amp) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amp;
    img.data[i] = Math.max(0, Math.min(255, baseR + n));
    img.data[i + 1] = Math.max(0, Math.min(255, baseG + n));
    img.data[i + 2] = Math.max(0, Math.min(255, baseB + n));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, ctx };
}

function makeAsphaltTexture() {
  const { canvas, ctx } = noiseCanvas(256, 62, 64, 70, 22);
  ctx.strokeStyle = 'rgba(20,20,22,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.quadraticCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(18,16,14,0.22)';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(Math.random() * 256, Math.random() * 256, 18 + Math.random() * 28, 8 + Math.random() * 14, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 48);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeSidewalkTexture() {
  const { canvas, ctx } = noiseCanvas(256, 176, 170, 158, 16);
  ctx.strokeStyle = 'rgba(90,86,78,0.45)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo((i / 4) * 256, 0);
    ctx.lineTo((i / 4) * 256, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i / 4) * 256);
    ctx.lineTo(256, (i / 4) * 256);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(4, 4, 56, 56);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 80);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#3d6ea8');
  g.addColorStop(0.42, '#7eadd8');
  g.addColorStop(0.68, '#e0b878');
  g.addColorStop(0.86, '#f0d2a8');
  g.addColorStop(1, '#d8c8b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeTree(rng) {
  const g = new THREE.Group();
  const S = shared();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
  const leafA = new THREE.MeshLambertMaterial({ color: 0x3d6a38 });
  const leafB = new THREE.MeshLambertMaterial({ color: 0x2f5430 });
  const trunk = new THREE.Mesh(S.trunk, trunkMat);
  trunk.position.y = 0.8;
  g.add(trunk);
  const s1 = 0.85 + rng() * 0.35;
  const crown = new THREE.Mesh(S.foliage, leafA);
  crown.position.set(0, 2.05, 0);
  crown.scale.set(s1, 0.9 + rng() * 0.25, s1);
  g.add(crown);
  const crown2 = new THREE.Mesh(S.foliage, leafB);
  crown2.position.set(0.25, 2.35, -0.1);
  crown2.scale.set(0.7, 0.65, 0.7);
  g.add(crown2);
  return g;
}

function makePedestrian(rng) {
  const g = new THREE.Group();
  const clothes = [0x2b4c7e, 0x8a3a32, 0x3d5a3a, 0x4a4a52, 0xc4a060, 0x1a1a1e];
  const pantsC = [0x2a2e38, 0x3a3330, 0x4a5060, 0x1e2428];
  const skinC = [0xe8c4a2, 0xd4a574, 0xc4a484, 0x8d5524, 0xf0d0b0];
  const body = new THREE.MeshLambertMaterial({ color: clothes[Math.floor(rng() * clothes.length)] });
  const pants = new THREE.MeshLambertMaterial({ color: pantsC[Math.floor(rng() * pantsC.length)] });
  const skin = new THREE.MeshLambertMaterial({ color: skinC[Math.floor(rng() * skinC.length)] });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.32, 4, 8), body);
  torso.position.y = 1.15;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skin);
  head.position.y = 1.52;
  g.add(head);
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), pants);
  hip.position.y = 0.92;
  hip.scale.set(1.2, 0.7, 0.9);
  g.add(hip);
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.38, 3, 6), pants);
  legL.position.set(-0.08, 0.48, 0);
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.38, 3, 6), pants);
  legR.position.set(0.08, 0.48, 0);
  g.add(legR);
  g.userData.legL = legL;
  g.userData.legR = legR;
  g.userData.phase = rng() * Math.PI * 2;
  return g;
}

function makeHydrant() {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xb42020 });
  const cap = new THREE.MeshLambertMaterial({ color: 0x8a1818 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 8), red);
  base.position.y = 0.06;
  g.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.42, 8), red);
  body.position.y = 0.32;
  g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), cap);
  top.position.y = 0.56;
  g.add(top);
  for (const sx of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6), cap);
    n.rotation.z = Math.PI / 2;
    n.position.set(sx * 0.12, 0.38, 0);
    g.add(n);
  }
  return g;
}

function makeTrashCan() {
  const g = new THREE.Group();
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.7, 8),
    new THREE.MeshLambertMaterial({ color: 0x3a4048 })
  );
  can.position.y = 0.35;
  g.add(can);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.06, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a3036 })
  );
  lid.position.y = 0.72;
  g.add(lid);
  return g;
}

function makeTrafficLight(side) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 6), poleMat);
  pole.position.y = 2.3;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), poleMat);
  arm.position.set(side > 0 ? -1.1 : 1.1, 4.4, 0);
  g.add(arm);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.7, 0.28),
    new THREE.MeshLambertMaterial({ color: 0x1a1c20 })
  );
  box.position.set(side > 0 ? -2.2 : 2.2, 4.2, 0);
  g.add(box);
  const colors = [0x22cc44, 0xffcc22, 0xff2222];
  for (let i = 0; i < 3; i++) {
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 8),
      new THREE.MeshLambertMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: i === 0 ? 0.7 : 0.15,
      })
    );
    lens.position.set(side > 0 ? -2.32 : 2.32, 4.42 - i * 0.22, 0);
    lens.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(lens);
  }
  return g;
}

function makeParkedCar(style, paint) {
  const g = makeCarMesh(style);
  paintCar(g, paint);
  return g;
}

function makeCloud(rng) {
  const g = new THREE.Group();
  const S = shared();
  const mat = new THREE.MeshLambertMaterial({
    color: 0xf6f2ea,
    transparent: true,
    opacity: 0.78,
  });
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(S.cloud, mat);
    p.position.set((rng() - 0.5) * 4.5, (rng() - 0.5) * 1.1, (rng() - 0.5) * 2.2);
    const s = 1.4 + rng() * 2.2;
    p.scale.set(s * 1.6, s * 0.55, s);
    g.add(p);
  }
  return g;
}

function makeFacadeTexture(pal, seed) {
  const key = `${pal.wall}-${seed}`;
  if (facadeCache.has(key)) return facadeCache.get(key);

  const cols = 6;
  const floors = 10;
  const tw = 128;
  const th = 256;
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hexCss(pal.wall);
  ctx.fillRect(0, 0, tw, th);

  // Panel / floor lines
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 1;
  for (let y = 1; y < floors; y++) {
    const yy = (y / floors) * th;
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(tw, yy);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let c = 1; c < cols; c++) {
    const xx = (c / cols) * tw;
    ctx.beginPath();
    ctx.moveTo(xx, 0);
    ctx.lineTo(xx, th);
    ctx.stroke();
  }

  const rng = mulberry32(seed);
  const cellW = tw / cols;
  const cellH = th / floors;
  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const dark = rng() < 0.22;
      ctx.fillStyle = dark ? '#2a3a46' : hexCss(pal.glass);
      const ww = cellW * 0.5;
      const hh = cellH * 0.56;
      ctx.fillRect(c * cellW + (cellW - ww) / 2, r * cellH + (cellH - hh) / 2, ww, hh);
      if (!dark) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(c * cellW + (cellW - ww) / 2, r * cellH + (cellH - hh) / 2, ww * 0.35, hh * 0.28);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  facadeCache.set(key, tex);
  return tex;
}

function boxMesh(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Multi-volume city building: podium, setback shafts, roof plant, wing, street facade.
 */
function makeComplexBuilding(side, row, index) {
  const rng = mulberry32(((side + 3) * 7919 + row * 104729 + index * 1301 + 17) >>> 0);
  const pal = BUILDING_PALETTES[Math.floor(rng() * BUILDING_PALETTES.length)];
  const group = new THREE.Group();

  const h = (row === 0 ? 7 : row === 1 ? 12 : 18) + rng() * (row === 0 ? 11 : row === 1 ? 16 : 20);
  const w = 2.3 + rng() * (row === 0 ? 2.4 : 3.2);
  const d = 2.1 + rng() * (row === 0 ? 2.6 : 3.4);

  const wallMat = new THREE.MeshStandardMaterial({
    color: pal.wall,
    roughness: 0.84,
    metalness: 0.06,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: pal.trim,
    roughness: 0.72,
    metalness: 0.12,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: pal.accent,
    roughness: 0.68,
    metalness: 0.14,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: pal.roof,
    roughness: 0.92,
    metalness: 0.04,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: pal.glass,
    roughness: 0.16,
    metalness: 0.58,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x8a9298,
    roughness: 0.38,
    metalness: 0.62,
  });
  const facadeTex = makeFacadeTexture(pal, 200 + index * 3 + row * 11);
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.08,
  });
  facadeMat.map.repeat.set(1, Math.max(1, Math.round(h / 9)));

  const roadFace = side > 0 ? 1 : 0; // -X vs +X
  const shaftMats = [
    roadFace === 0 ? facadeMat : wallMat,
    roadFace === 1 ? facadeMat : wallMat,
    roofMat,
    wallMat,
    wallMat,
    wallMat,
  ];

  // —— Ground podium / retail base ——
  const podiumH = 1.55 + rng() * 0.55;
  const podiumW = w + 0.5;
  const podiumD = d + 0.38;
  const podium = boxMesh(podiumW, podiumH, podiumD, accentMat);
  podium.position.y = podiumH / 2;
  group.add(podium);

  // Storefront glass on the street face
  const store = boxMesh(podiumW * 0.72, podiumH * 0.52, 0.08, glassMat);
  store.position.set(0, podiumH * 0.48, 0);
  store.position.x = side > 0 ? -podiumW / 2 - 0.04 : podiumW / 2 + 0.04;
  group.add(store);

  // Colored awning
  const awningMat = new THREE.MeshStandardMaterial({
    color: pal.awning,
    roughness: 0.7,
    metalness: 0.05,
  });
  const awning = boxMesh(podiumW * 0.82, 0.07, 0.52, awningMat);
  awning.position.set(
    side > 0 ? -podiumW / 2 - 0.22 : podiumW / 2 + 0.22,
    podiumH * 0.8,
    0
  );
  group.add(awning);

  // Door
  const door = boxMesh(0.42, podiumH * 0.62, 0.06, new THREE.MeshStandardMaterial({
    color: 0x2a2420,
    roughness: 0.55,
    metalness: 0.2,
  }));
  door.position.set(
    side > 0 ? -podiumW / 2 - 0.05 : podiumW / 2 + 0.05,
    podiumH * 0.34,
    podiumD * 0.18 * (rng() > 0.5 ? 1 : -1)
  );
  group.add(door);

  // —— Stacked shafts with setbacks ——
  const setbacks = row === 2 ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 2);
  let y = podiumH;
  let cw = w;
  let cd = d;
  let remaining = h - podiumH;

  for (let s = 0; s < setbacks; s++) {
    const last = s === setbacks - 1;
    const segH = last ? remaining : remaining * (0.38 + rng() * 0.22);
    remaining = Math.max(0.4, remaining - segH);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(cw, segH, cd), shaftMats);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    shaft.position.y = y + segH / 2;
    group.add(shaft);

    // Belt / cornice every few floors
    const belts = Math.max(1, Math.floor(segH / 4.2));
    for (let b = 1; b <= belts; b++) {
      const belt = boxMesh(cw + 0.14, 0.1, cd + 0.14, trimMat);
      belt.position.y = y + (b / (belts + 1)) * segH;
      group.add(belt);
    }

    // Crown ledge at top of this volume
    const crown = boxMesh(cw + 0.22, 0.14, cd + 0.22, trimMat);
    crown.position.y = y + segH + 0.04;
    group.add(crown);

    y += segH;
    cw *= 0.74 + rng() * 0.1;
    cd *= 0.78 + rng() * 0.1;
  }

  // —— Roof mechanicals ——
  const roofY = y + 0.08;
  const deck = boxMesh(cw + 0.28, 0.12, cd + 0.28, roofMat);
  deck.position.y = roofY;
  group.add(deck);

  const pentW = Math.max(0.7, cw * 0.48);
  const pentD = Math.max(0.7, cd * 0.5);
  const pentH = 0.7 + rng() * 1.5;
  const pent = boxMesh(pentW, pentH, pentD, trimMat);
  pent.position.y = roofY + 0.06 + pentH / 2;
  group.add(pent);

  if (rng() < 0.75) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.28, 0.72, 10),
      metalMat
    );
    tank.castShadow = true;
    tank.position.set(cw * 0.28, roofY + 0.46, cd * 0.12);
    group.add(tank);
  }
  if (rng() < 0.7) {
    const ac = boxMesh(0.55, 0.28, 0.42, metalMat);
    ac.position.set(-cw * 0.22, roofY + 0.2, -cd * 0.1);
    group.add(ac);
  }
  if (rng() < 0.6) {
    const antH = 1.8 + rng() * 2.4;
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.04, antH, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.65, roughness: 0.32 })
    );
    ant.position.set(-cw * 0.08, roofY + antH / 2, 0);
    group.add(ant);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x881111, emissiveIntensity: 0.35 })
    );
    tip.position.set(-cw * 0.08, roofY + antH, 0);
    group.add(tip);
  }

  // Billboard on some mid/back towers
  if (row > 0 && rng() < 0.4) {
    const board = boxMesh(cw * 0.85, 1.1, 0.08, new THREE.MeshStandardMaterial({
      color: rng() < 0.5 ? 0xf0d060 : 0x3a8ad8,
      roughness: 0.45,
      metalness: 0.1,
    }));
    board.position.set(
      side > 0 ? -cw / 2 - 0.08 : cw / 2 + 0.08,
      h * (0.55 + rng() * 0.2),
      0
    );
    group.add(board);
  }

  // Side annex / shorter wing
  if (rng() < 0.62) {
    const wingH = Math.max(podiumH + 2, h * (0.32 + rng() * 0.28));
    const wingW = w * (0.38 + rng() * 0.18);
    const wingD = d * (0.55 + rng() * 0.25);
    const wing = boxMesh(wingW, wingH, wingD, wallMat);
    wing.position.set(
      (rng() - 0.5) * w * 0.15,
      wingH / 2,
      (rng() > 0.5 ? 1 : -1) * (d * 0.38)
    );
    group.add(wing);
    const wingCrown = boxMesh(wingW + 0.12, 0.1, wingD + 0.12, trimMat);
    wingCrown.position.set(wing.position.x, wingH + 0.04, wing.position.z);
    group.add(wingCrown);
  }

  // Vertical corner pilaster
  const pil = boxMesh(0.2, h * 0.82, 0.2, trimMat);
  pil.position.set(
    side > 0 ? -w * 0.42 : w * 0.42,
    h * 0.48,
    d * 0.42 * (rng() > 0.5 ? 1 : -1)
  );
  group.add(pil);

  // Front-row balconies (3D depth on the street face)
  if (row === 0) {
    const balCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < balCount; i++) {
      const by = podiumH + 1.4 + i * 1.55;
      if (by > h - 1.2) break;
      const bx = side > 0 ? -w / 2 - 0.16 : w / 2 + 0.16;
      const bz = (i % 2 === 0 ? -0.35 : 0.35) * d * 0.35;
      const slab = boxMesh(0.32, 0.06, 0.55, trimMat);
      slab.position.set(bx, by, bz);
      group.add(slab);
      const rail = boxMesh(0.04, 0.22, 0.55, trimMat);
      rail.position.set(bx + (side > 0 ? -0.14 : 0.14), by + 0.12, bz);
      group.add(rail);
    }
  }

  // Street-side planter / stoop
  if (row === 0 && rng() < 0.55) {
    const stoop = boxMesh(0.7, 0.22, 1.1, new THREE.MeshStandardMaterial({
      color: 0x9a968c,
      roughness: 0.9,
    }));
    stoop.position.set(
      side > 0 ? -podiumW / 2 - 0.4 : podiumW / 2 + 0.4,
      0.11,
      0
    );
    group.add(stoop);
  }

  const spacing = row === 0 ? 13 : row === 1 ? 16 : 20;
  const count = row === 0 ? 16 : row === 1 ? 12 : 10;
  const xOff = side * (7.7 + row * 5.1 + rng() * 1.3);
  group.position.set(xOff, 0, index * spacing + rng() * 3.2);

  return { mesh: group, side, span: count * spacing };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.w = 800;
    this.h = 450;
    this.shake = 0;
    this.flash = 0;

    const dpr = window.devicePixelRatio || 1;
    this._dpr = Math.min(dpr, 1.25);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: dpr < 1.3,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(this._dpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this._baseExposure = 1.22;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ec8ee);
    // Soft midday haze — keeps depth without swallowing the city
    this.scene.fog = new THREE.FogExp2(0xc5dff0, 0.0075);
    this.dayFog = new THREE.Color(0xc5dff0);
    this.dangerFog = new THREE.Color(0xe8b8a0);

    // Perspective camera — classic 3rd-person chase (clear 3D depth)
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 220);
    this.camera.position.set(0, 5.2, -9.5);

    // Must exist before _setupWorld() — it pushes into these arrays
    this.buildingGroups = [];
    this.roadMarkings = [];
    this.scrollPieces = [];
    this.dashGroup = null;
    this._pool = { coin: [], crate: [], barrier: [], cone: [], sign: [] };
    this._obstacleProto = {};
    this._stamp = 0;
    this._vCamPos = new THREE.Vector3();
    this._vCamTarget = new THREE.Vector3();
    this._fogMix = new THREE.Color();
    this._badFrames = 0;
    this._lastPresent = 0;

    this._setupLights();
    this._setupWorld();

    this.playerMesh = null;
    this.playerCharId = null;
    this.copMesh = makeCop();
    this.scene.add(this.copMesh);

    this.entityMeshes = new Map();
    this.particleMeshes = [];
    this.flashMesh = null;

    const S = shared();
    this.playerBlob = new THREE.Mesh(S.blob, S.blobMat);
    this.playerBlob.rotation.x = -Math.PI / 2;
    this.scene.add(this.playerBlob);
    this.copBlob = new THREE.Mesh(S.blob, S.blobMat);
    this.copBlob.rotation.x = -Math.PI / 2;
    this.scene.add(this.copBlob);

    this._buildFlashOverlay();
    this.setPlayerCharacter({
      id: 'runner',
      color: 0x2b6cb0,
      accent: 0x1a365d,
      skin: 0xe8c4a2,
    });
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xb7dcff, 0xc4b896, 1.05);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3d0, 1.35);
    sun.position.set(28, 48, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    const amb = new THREE.AmbientLight(0xfff6ea, 0.52);
    this.scene.add(amb);
    // Camera-side fill so runner + obstacles stay readable
    const fill = new THREE.DirectionalLight(0xffe8c4, 0.38);
    fill.position.set(0, 8, -10);
    this.scene.add(fill);
    this.streetLight = null;
  }

  _setupWorld() {
    const S = shared();

    // Distant ground (city floor / horizon depth)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 400),
      new THREE.MeshLambertMaterial({ color: 0x6a8a58 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, 150);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scrollPieces.push(ground);

    // Road
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 400),
      new THREE.MeshLambertMaterial({ color: 0x4a4e56 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 150);
    road.receiveShadow = true;
    this.scene.add(road);
    this.road = road;
    this.scrollPieces.push(road);

    // Raised curbs (adds 3D volume on road edges)
    const curbMat = new THREE.MeshLambertMaterial({ color: 0xd4cfc4 });
    const curbGeo = new THREE.BoxGeometry(0.35, 0.18, 400);
    for (const x of [-5.15, 5.15]) {
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(x, 0.09, 150);
      curb.castShadow = false;
      curb.receiveShadow = true;
      this.scene.add(curb);
      this.scrollPieces.push(curb);
    }

    // Sidewalks
    const walkMat = new THREE.MeshLambertMaterial({ color: 0xc8c2b6 });
    const walkGeo = new THREE.PlaneGeometry(2.4, 400);
    for (const x of [-6.2, 6.2]) {
      const walk = new THREE.Mesh(walkGeo, walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.02, 150);
      walk.receiveShadow = true;
      this.scene.add(walk);
      this.scrollPieces.push(walk);
    }

    // Lane dashes — one instanced mesh, scrolled as a group (was 80 draw calls)
    const dashMesh = new THREE.InstancedMesh(S.dash, S.dashMat, 80);
    dashMesh.frustumCulled = false;
    dashMesh.castShadow = false;
    dashMesh.receiveShadow = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 40; i++) {
      for (let k = 0; k < 2; k++) {
        dummy.position.set(k === 0 ? -1.1 : 1.1, 0.03, i * 6);
        dummy.updateMatrix();
        dashMesh.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    }
    dashMesh.instanceMatrix.needsUpdate = true;
    this.dashGroup = new THREE.Group();
    this.dashGroup.add(dashMesh);
    this.scene.add(this.dashGroup);

    // Buildings — one textured box each. Per-window meshes were ~1000 extra draw calls.
    for (let side = -1; side <= 1; side += 2) {
      for (let row = 0; row < 2; row++) {
        const count = row === 0 ? 14 : 10;
        const spacing = row === 0 ? 14 : 18;
        for (let i = 0; i < count; i++) {
          const rng = mulberry32(((side + 3) * 7919 + row * 104729 + i * 1301 + 17) >>> 0);
          const pal = BUILDING_PALETTES[Math.floor(rng() * BUILDING_PALETTES.length)];
          const h = (row === 0 ? 6 : 11) + rng() * (row === 0 ? 10 : 16);
          const w = 2.3 + rng() * (row === 0 ? 2.4 : 3.0);
          const d = 2.1 + rng() * (row === 0 ? 2.4 : 3.2);

          const facadeTex = makeFacadeTexture(pal, 200 + i * 3 + row * 11).clone();
          facadeTex.repeat.set(1, Math.max(1, Math.round(h / 8)));
          const facadeMat = new THREE.MeshLambertMaterial({ map: facadeTex, color: 0xffffff });
          const wallMat = new THREE.MeshLambertMaterial({ color: pal.wall });
          const roofMat = new THREE.MeshLambertMaterial({ color: pal.roof });
          const towardRoad = side > 0 ? 1 : 0; // -X vs +X
          const mats = [
            towardRoad === 0 ? facadeMat : wallMat,
            towardRoad === 1 ? facadeMat : wallMat,
            roofMat,
            wallMat,
            wallMat,
            wallMat,
          ];

          const mesh = new THREE.Mesh(S.unitBox, mats);
          mesh.scale.set(w, h, d);
          mesh.castShadow = row === 0;
          mesh.receiveShadow = false;
          const xOff = side * (7.6 + row * 5.0 + rng() * 1.2);
          mesh.position.set(xOff, h / 2, i * spacing + rng() * 3);
          this.scene.add(mesh);
          this.buildingGroups.push({ mesh, side, span: count * spacing });
        }
      }
    }

    // Street lamps — emissive heads only (PointLights per lamp were a huge shader cost)
    this.lamps = [];
    const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x3a4250 });
    const lampHeadMat = new THREE.MeshLambertMaterial({
      color: 0x2a3040,
      emissive: 0xffe0a0,
      emissiveIntensity: 0.55,
    });
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6);
    const headGeo = new THREE.BoxGeometry(0.5, 0.12, 0.25);
    for (let i = 0; i < 8; i++) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, lampPoleMat);
      pole.position.y = 2.1;
      lamp.add(pole);
      const head = new THREE.Mesh(headGeo, lampHeadMat);
      head.position.set(i % 2 === 0 ? 0.3 : -0.3, 4.1, 0);
      lamp.add(head);
      lamp.position.set(i % 2 === 0 ? -5.2 : 5.2, 0, i * 18);
      this.scene.add(lamp);
      this.lamps.push(lamp);
    }

    // Soft daylight clouds instead of a starfield (one cheap draw call)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 80;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = 18 + Math.random() * 28;
      positions[i * 3 + 2] = -20 + Math.random() * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xf4fbff, size: 1.6, sizeAttenuation: true, opacity: 0.35, transparent: true })
    );
    this.scene.add(stars);
    this.stars = stars;

    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff4cc })
    );
    moonMesh.position.set(-22, 26, 50);
    this.scene.add(moonMesh);
    this.moonMesh = moonMesh;
  }

  _buildFlashOverlay() {
    // Screen flash handled via renderer clear tint in draw
  }

  setPlayerCharacter(char) {
    if (this.playerMesh) {
      this.scene.remove(this.playerMesh);
      this.playerMesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    this.playerMesh = makeHumanoid({
      body: char.color,
      accent: char.accent,
      skin: char.skin,
      scale: 1,
    });
    this.scene.add(this.playerMesh);
    this.playerCharId = char.id;
  }

  resize() {
    const parent = this.canvas.parentElement || document.body;
    const cssW = parent.clientWidth || window.innerWidth;
    const cssH = parent.clientHeight || window.innerHeight;
    this.w = cssW;
    this.h = cssH;
    this.camera.aspect = cssW / Math.max(1, cssH);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(cssW, cssH, false);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
  }

  addShake(amount = 0.2) {
    this.shake = Math.max(this.shake, amount);
  }

  addFlash(a = 0.35) {
    this.flash = Math.max(this.flash, a);
  }

  onRunStart() {
    for (const [id, m] of this.entityMeshes) {
      this._recycleEntity(id, m);
    }
    this.entityMeshes.clear();
  }

  _recycleEntity(id, mesh) {
    this.scene.remove(mesh);
    this.entityMeshes.delete(id);
    const kind = mesh.userData.kind || 'misc';
    const pool = this._pool[kind] || (this._pool[kind] = []);
    if (pool.length < 32) {
      mesh.visible = false;
      pool.push(mesh);
    }
  }

  _ensureEntityMesh(e) {
    if (this.entityMeshes.has(e.id)) return this.entityMeshes.get(e.id);
    const kind = e.type === 'coin' ? 'coin' : e.kind === 'car' ? `car-${e.style}` : e.kind || 'crate';
    const pool = this._pool[kind] || (this._pool[kind] = []);
    let mesh = pool.pop();
    if (!mesh) {
      if (kind === 'coin') {
        const S = shared();
        mesh = new THREE.Mesh(S.coin, S.coinMat);
        mesh.rotation.x = Math.PI / 2;
        mesh.castShadow = false;
        mesh.userData.isCoin = true;
      } else {
        if (!this._obstacleProto[kind]) {
          this._obstacleProto[kind] = makeObstacleMesh(e);
        }
        mesh = this._obstacleProto[kind].clone();
        if (e.kind === 'car') bindCarParts(mesh);
      }
      mesh.userData.kind = kind;
    }
    if (e.kind === 'car') paintCar(mesh, e.paint);
    mesh.visible = true;
    this.scene.add(mesh);
    this.entityMeshes.set(e.id, mesh);
    return mesh;
  }

  _animateHuman(mesh, anim, sliding, onGround) {
    if (!mesh?.userData) return;
    const {
      legL, legR, kneeL, kneeR,
      armL, armR, elbowL, elbowR,
      torso, head, hips,
    } = mesh.userData;

    const amp = onGround && !sliding ? 1.05 : 0.14;
    const swing = Math.sin(anim) * amp;
    const bob = onGround && !sliding ? Math.abs(Math.sin(anim)) * 0.05 : 0;
    // Knee bends on the recovering leg
    const kneeBendL = onGround && !sliding ? Math.max(0, -Math.sin(anim)) * 0.9 : 0.15;
    const kneeBendR = onGround && !sliding ? Math.max(0, Math.sin(anim)) * 0.9 : 0.15;

    if (legL) legL.rotation.set(swing, 0, 0);
    if (legR) legR.rotation.set(-swing, 0, 0);
    if (kneeL) kneeL.rotation.set(kneeBendL, 0, 0);
    if (kneeR) kneeR.rotation.set(kneeBendR, 0, 0);

    if (armL) armL.rotation.set(-swing * 1.1, 0, 0.18);
    if (armR) armR.rotation.set(swing * 1.1, 0, -0.18);
    if (elbowL) elbowL.rotation.set(-0.55 - swing * 0.25, 0, 0);
    if (elbowR) elbowR.rotation.set(-0.55 + swing * 0.25, 0, 0);

    if (torso) {
      // Lean into the run; yaw stays 0 so backpack faces camera
      torso.rotation.set(sliding ? 1.05 : 0.18, 0, swing * 0.04);
      torso.position.y = (sliding ? 0.72 : 1.12) + bob;
      torso.position.z = sliding ? 0.12 : 0.02;
    }
    if (hips) {
      hips.position.y = (sliding ? 0.55 : 0.92) + bob * 0.5;
      hips.rotation.set(sliding ? 0.9 : 0.05, 0, -swing * 0.06);
    }
    if (head) {
      head.rotation.set(sliding ? 0.35 : -0.08, 0, -swing * 0.05);
    }
  }

  /**
   * Lock runner facing: back to camera, sprint straight into +Z.
   * Never call mesh.lookAt() — Three.js aims local −Z at the target, which
   * yaws the figure 90°/180° and makes them look like they run sideways.
   */
  _faceDownRoad(mesh, x, y, z) {
    mesh.position.set(x, y, z);
    // Hard identity: chest/nose stay on +Z, backpack on −Z (toward camera)
    mesh.rotation.order = 'XYZ';
    mesh.rotation.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.up.set(0, 1, 0);
  }

  _tuneQuality() {
    const now = performance.now();
    if (this._lastPresent) {
      const frameMs = now - this._lastPresent;
      if (frameMs > 36) this._badFrames += 1;
      else this._badFrames = Math.max(0, this._badFrames - 0.4);
      if (this._badFrames > 40 && this._dpr > 1) {
        this._dpr = 1;
        this.renderer.setPixelRatio(1);
        this.resize();
        this._badFrames = 0;
      }
    }
    this._lastPresent = now;
  }

  draw(state) {
    const { player, cop, entities, particles, time, character, phase } = state;
    const pz = player.z;
    this._tuneQuality();

    // Character swap
    if (character && character.id !== this.playerCharId) {
      this.setPlayerCharacter(character);
    }

    // Player — back to camera, sprinting into the city (+Z)
    if (this.playerMesh) {
      this._faceDownRoad(this.playerMesh, player.x, player.y, player.z);
      this.playerMesh.visible = player.invuln <= 0 || Math.floor(time * 20) % 2 === 0;
      this._animateHuman(this.playerMesh, player.anim, player.sliding, player.onGround);
      // Scale only Y for slide — never flip X/Z or they'll look turned
      if (player.sliding) this.playerMesh.scale.set(1, 0.55, 1);
      else this.playerMesh.scale.set(1, 1, 1);
    }

    // Cop — same facing, chasing from behind (also running away from cam into +Z)
    const cz = cop.worldZ(player.z);
    this._faceDownRoad(this.copMesh, cop.x, 0, cz);
    this._animateHuman(this.copMesh, cop.anim, false, true);
    const siren = this.copMesh.userData.siren;
    if (siren) {
      const on = Math.sin(cop.siren) > 0;
      if (siren.isLight) {
        siren.color.set(on ? 0xff2222 : 0x2244ff);
        siren.intensity = 1.4;
      } else if (siren.emissive) {
        siren.emissive.setHex(on ? 0xff2222 : 0x2244ff);
        siren.emissiveIntensity = on ? 0.9 : 0.45;
      }
    }

    if (this.playerBlob) {
      const jumpScale = player.onGround ? 1 : 0.55;
      const slideScale = player.sliding ? 1.2 : 1;
      this.playerBlob.position.set(player.x, 0.04, player.z);
      this.playerBlob.scale.set(jumpScale * slideScale, jumpScale * slideScale, 1);
      this.playerBlob.visible = !!this.playerMesh?.visible;
    }
    if (this.copBlob) {
      this.copBlob.position.set(cop.x, 0.04, cz);
    }

    // Entities — world Y is always 0 for groups (local offsets handle height)
    this._stamp++;
    const stamp = this._stamp;
    for (const e of entities) {
      if (e.type === 'coin' && e.collected) continue;
      const mesh = this._ensureEntityMesh(e);
      mesh.userData.stamp = stamp;
      if (e.type === 'coin') {
        mesh.position.set(e.x, e.y, e.z);
        mesh.rotation.y = e.spin + time * 5;
      } else if (e.kind === 'car') {
        mesh.position.set(e.x, 0, e.z);
        mesh.rotation.set(0, 0, 0);
        mesh.visible = true;
        const wheels = mesh.userData.wheels;
        if (wheels) {
          for (const wheel of wheels) wheel.rotation.x = e.wheelSpin || 0;
        }
      } else {
        mesh.position.set(e.x, 0, e.z);
        mesh.visible = true;
      }
    }
    for (const [id, mesh] of this.entityMeshes) {
      if (mesh.userData.stamp !== stamp) this._recycleEntity(id, mesh);
    }

    // Simple particle dots (shared geometry, unique color materials)
    const S = shared();
    while (this.particleMeshes.length < particles.length) {
      const m = new THREE.Mesh(S.particle, new THREE.MeshBasicMaterial({ color: 0xffd56a }));
      this.scene.add(m);
      this.particleMeshes.push(m);
    }
    for (let i = 0; i < this.particleMeshes.length; i++) {
      const m = this.particleMeshes[i];
      const p = particles[i];
      if (!p) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.set(p.x, p.y, p.z);
      m.scale.setScalar(p.size * 8 * (p.life / p.max));
      if (m.material && p.color) m.material.color.set(p.color);
    }

    // Recycle buildings / lamps / dashes around player
    for (const b of this.buildingGroups) {
      const mesh = b.mesh;
      let z = mesh.position.z;
      while (z < pz - 20) z += b.span;
      while (z > pz + b.span - 20) z -= b.span;
      mesh.position.z = z;
    }
    const lampSpan = this.lamps.length * 18;
    for (let i = 0; i < this.lamps.length; i++) {
      const lamp = this.lamps[i];
      let z = lamp.position.z;
      z = ((z - pz) % lampSpan + lampSpan) % lampSpan + pz - 8;
      lamp.position.z = z;
    }
    if (this.dashGroup) {
      const step = 6;
      this.dashGroup.position.z = Math.floor(pz / step) * step - 12;
    }
    const scrollZ = pz + 150;
    for (const piece of this.scrollPieces) piece.position.z = scrollZ;

    if (this.sun) {
      this.sun.position.set(player.x + 22, 42, player.z + 12);
      this.sun.target.position.set(player.x, 0, player.z + 6);
      this.sun.target.updateMatrixWorld();
    }

    // Camera follow
    let shakeX = 0;
    let shakeY = 0;
    if (this.shake > 0) {
      shakeX = (Math.random() - 0.5) * this.shake;
      shakeY = (Math.random() - 0.5) * this.shake;
      this.shake *= 0.88;
      if (this.shake < 0.02) this.shake = 0;
    }

    // Chase cam: strictly behind on −Z, looking into +Z so we see their backs
    const bob = phase === 'playing' ? Math.sin(time * 10) * 0.025 : Math.sin(time * 1.2) * 0.05;
    this._vCamTarget.set(player.x, 1.15 + player.y * 0.25, player.z + 10);
    this._vCamPos.set(
      player.x + shakeX * 0.35,
      3.9 + shakeY + bob + (phase === 'menu' ? 0.35 : 0),
      player.z - 7.2
    );
    // Snap X hard so lane changes never give a side profile
    this.camera.position.x += (this._vCamPos.x - this.camera.position.x) * 0.45;
    this.camera.position.y += (this._vCamPos.y - this.camera.position.y) * 0.2;
    this.camera.position.z += (this._vCamPos.z - this.camera.position.z) * 0.28;
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this._vCamTarget);

    // Keep sky props near the player so depth stays visible
    if (this.stars) this.stars.position.z = player.z + 40;
    if (this.moonMesh) this.moonMesh.position.set(player.x - 22, 26, player.z + 50);

    // Danger fog when cop close (reuse colors — no per-frame allocations)
    const danger = 1 - cop.getGapRatio();
    const t = danger > 0.55 ? Math.min(1, (danger - 0.55) * 2.2) : 0;
    this._fogMix.lerpColors(this.dayFog, this.dangerFog, t);
    this.scene.fog.color.copy(this._fogMix);

    this.renderer.render(this.scene, this.camera);

    if (this.flash > 0) {
      this.renderer.toneMappingExposure = this._baseExposure + this.flash * 1.8;
      this.flash *= 0.85;
      if (this.flash < 0.02) {
        this.flash = 0;
        this.renderer.toneMappingExposure = this._baseExposure;
      }
    }
  }
}
