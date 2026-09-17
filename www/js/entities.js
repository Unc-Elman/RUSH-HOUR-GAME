/** 3D world entities — Z forward, Y up, X lanes */

export const LANES = [-2.2, 0, 2.2];
export const GROUND_Y = 0;

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.lane = 1; // center
    this.x = LANES[1];
    this.targetX = LANES[1];
    this.y = 0; // foot height above ground
    this.z = 0;
    this.vy = 0;
    this.height = 1.7;
    this.radius = 0.35;
    this.onGround = true;
    this.sliding = false;
    this.slideTimer = 0;
    this.anim = 0;
    this.alive = true;
    this.invuln = 0;
    this.jumpMul = 1;
    this.landed = false;
    this.landImpact = 0;
  }

  setLane(dir) {
    // dir: −1 toward world −X (screen-right), +1 toward world +X (screen-left)
    const next = Math.max(0, Math.min(2, this.lane + dir));
    if (next === this.lane) return false;
    this.lane = next;
    this.targetX = LANES[this.lane];
    return true;
  }

  jump() {
    if (!this.alive || !this.onGround || this.sliding) return false;
    // Running jump: ~1.4 m peak — arcade-readable, still a human-scale hop
    this.vy = 8.6 * this.jumpMul;
    this.onGround = false;
    return true;
  }

  startSlide() {
    if (!this.alive || !this.onGround || this.sliding) return false;
    this.sliding = true;
    this.slideTimer = 0.55;
    return true;
  }

  /** Axis-aligned hit volume in world space */
  get hitbox() {
    const h = this.sliding ? 0.7 : this.height;
    const y0 = this.sliding ? 0 : this.y;
    return {
      x: this.x - this.radius,
      y: y0,
      z: this.z - 0.35,
      w: this.radius * 2,
      h,
      d: 0.7,
    };
  }

  update(dt) {
    if (!this.alive) return;
    this.landed = false;
    this.anim += dt * (this.onGround && !this.sliding ? 12.5 : 5);

    // Weightier lane change — a real sidestep takes ~0.35 s across 2.2 m
    this.x += (this.targetX - this.x) * Math.min(1, 9.5 * dt);

    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.sliding = false;
    }

    const wasAir = !this.onGround;
    // ~2.2 g — snappy enough to play, closer to real fall than the old 28
    this.vy -= 21.5 * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      if (wasAir && this.vy < -4) this.landImpact = Math.min(1, -this.vy / 12);
      this.y = 0;
      this.vy = 0;
      this.onGround = true;
      if (wasAir) this.landed = true;
    } else {
      this.onGround = false;
    }

    if (this.invuln > 0) this.invuln -= dt;
  }
}

export class Cop {
  constructor() {
    this.reset();
  }

  reset() {
    this.gap = 14; // meters behind player
    this.minGap = 2.8;
    this.maxGap = 18;
    this.pressure = 0;
    this.anim = 0;
    this.siren = 0;
    this.catching = false;
    this.x = 0;
    this.y = 0;
  }

  update(dt, speed, nearMissBoost, gapMul = 1) {
    this.anim += dt * 14;
    this.siren += dt * 8;

    // Pressure still closes the gap for HUD tension, but catching is
    // only triggered by obstacle bumps (see game.js) — never from gap alone.
    const closeRate = (0.55 + this.pressure * 1.1 + speed * 0.006) / gapMul;
    const openRate = 0.85 + nearMissBoost * 5.5;

    this.gap -= closeRate * dt;
    this.gap += openRate * dt;
    this.gap += Math.sin(this.anim * 0.35) * 0.15 * dt;
    // Keep a little breathing room so the meter never auto-ends a run
    this.gap = Math.max(this.minGap + 0.35, Math.min(this.maxGap, this.gap));
    this.catching = false;
  }

  getGapRatio() {
    return (this.gap - this.minGap) / (this.maxGap - this.minGap);
  }

  worldZ(playerZ) {
    return playerZ - this.gap;
  }
}

export function aabb3(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y &&
    a.z < b.z + b.d &&
    a.z + a.d > b.z
  );
}

let _id = 1;
function nid() {
  return _id++;
}

export function makeCoin(z, lane, height = 0.9) {
  return {
    id: nid(),
    type: 'coin',
    x: LANES[lane],
    y: height,
    z,
    r: 0.35,
    collected: false,
    spin: Math.random() * Math.PI * 2,
  };
}

export function makeObstacle(z, lane, kind) {
  const x = LANES[lane];
  // Sized to read clearly from the chase cam on a daylight road
  if (kind === 'crate') {
    return { id: nid(), type: 'obstacle', kind, x, y: 0, z, w: 1.35, h: 1.2, d: 1.2, lane, requires: 'jump' };
  }
  if (kind === 'barrier') {
    return { id: nid(), type: 'obstacle', kind, x, y: 0, z, w: 1.35, h: 1.35, d: 0.55, lane, requires: 'jump' };
  }
  if (kind === 'cone') {
    return { id: nid(), type: 'obstacle', kind, x, y: 0, z, w: 0.95, h: 1.05, d: 0.95, lane, requires: 'jump' };
  }
  // low hanging sign — slide under
  return { id: nid(), type: 'obstacle', kind: 'sign', x, y: 1.05, z, w: 1.85, h: 1.0, d: 0.45, lane, requires: 'slide' };
}

/** Real-world-ish passenger vehicles. Front faces −Z (oncoming vs the +Z runner). */
export const CAR_STYLES = {
  sedan: {
    w: 1.74,
    h: 1.44,
    d: 4.55,
    wheelR: 0.33,
    speed: 11.5,
    jumpable: true,
    paints: [0xefefef, 0xb8bec4, 0x161618, 0xa51c1c, 0x1a3f7a, 0x6a6e74, 0xc4b49a],
  },
  hatch: {
    w: 1.62,
    h: 1.30,
    d: 3.85,
    wheelR: 0.30,
    speed: 12.2,
    jumpable: true,
    paints: [0xf2f2f4, 0xb8bec4, 0x1e5a9c, 0xc43a22, 0x2f6b46, 0xf0c400, 0x2a2a2e],
  },
  sports: {
    w: 1.78,
    h: 1.14,
    d: 4.35,
    wheelR: 0.32,
    speed: 16.5,
    jumpable: true,
    paints: [0xb01018, 0x111111, 0xf2f2f2, 0xd45a10, 0x1a3a8c, 0xc9a227],
  },
  suv: {
    w: 1.88,
    h: 1.76,
    d: 4.70,
    wheelR: 0.38,
    speed: 10.2,
    jumpable: false,
    paints: [0xf0f0f2, 0x1a1c20, 0x6a7078, 0x1b2838, 0xb8bec4, 0x3a4a38],
  },
  pickup: {
    w: 1.80,
    h: 1.58,
    d: 5.20,
    wheelR: 0.36,
    speed: 10.6,
    jumpable: false,
    paints: [0xf4f4f6, 0xa51c1c, 0x1a1a1c, 0x1e4a8c, 0x6a6e74, 0xc45a1a],
  },
  taxi: {
    w: 1.74,
    h: 1.48,
    d: 4.55,
    wheelR: 0.33,
    speed: 11.2,
    jumpable: true,
    paints: [0xf0c400, 0xe8b400],
  },
  van: {
    w: 1.92,
    h: 1.92,
    d: 5.15,
    wheelR: 0.36,
    speed: 10.4,
    jumpable: false,
    paints: [0xf2f2f4, 0x1a1c20, 0x6a7078, 0xc43a22, 0x1e4a8c, 0xe8e0d0],
  },
  bus: {
    w: 2.48,
    h: 3.05,
    d: 10.8,
    wheelR: 0.52,
    speed: 8.6,
    jumpable: false,
    paints: [0xc45a1c, 0x1e4a8c, 0xd8d4cc, 0x2a6a46],
  },
};

const CAR_STYLE_IDS = Object.keys(CAR_STYLES);

export function pickCarStyle(difficulty = 0) {
  const roll = Math.random();
  if (difficulty > 6 && roll < 0.08) return 'bus';
  if (difficulty > 7 && roll < 0.20) return 'sports';
  if (roll < 0.20) return 'sedan';
  if (roll < 0.34) return 'hatch';
  if (roll < 0.46) return 'taxi';
  if (roll < 0.58) return 'van';
  if (roll < 0.74) return 'suv';
  if (roll < 0.90) return 'pickup';
  return CAR_STYLE_IDS[Math.floor(Math.random() * CAR_STYLE_IDS.length)];
}

export function makeCar(z, lane, style = 'sedan') {
  const spec = CAR_STYLES[style] || CAR_STYLES.sedan;
  const paints = spec.paints;
  return {
    id: nid(),
    type: 'obstacle',
    kind: 'car',
    style,
    x: LANES[lane],
    y: 0,
    z,
    w: spec.w,
    h: spec.h,
    d: spec.d,
    lane,
    requires: spec.jumpable ? 'jump' : 'dodge',
    speed: spec.speed * (0.86 + Math.random() * 0.32),
    paint: paints[Math.floor(Math.random() * paints.length)],
    wheelSpin: Math.random() * Math.PI * 2,
    wheelR: spec.wheelR,
  };
}

function laneOccupied(entities, lane, z, radius) {
  for (const e of entities) {
    if (e.lane !== lane) continue;
    const half = (e.d || 1.2) * 0.5 + radius;
    if (Math.abs(e.z - z) < half) return true;
  }
  return false;
}

export function makeParticle(x, y, z, color) {
  const a = Math.random() * Math.PI * 2;
  const sp = 2 + Math.random() * 4;
  return {
    x,
    y,
    z,
    vx: Math.cos(a) * sp,
    vy: 2 + Math.random() * 3,
    vz: Math.sin(a) * sp,
    life: 0.35 + Math.random() * 0.35,
    max: 0.7,
    color,
    size: 0.08 + Math.random() * 0.1,
  };
}

export class Spawner {
  constructor() {
    this.reset();
  }

  reset() {
    this.nextObs = 1.8;
    this.nextCoin = 0.7;
    this.nextCar = 2.1;
  }

  update(dt, playerZ, entities, difficulty) {
    this.nextObs -= dt;
    this.nextCoin -= dt;
    this.nextCar -= dt;

    if (this.nextObs <= 0) {
      this._spawnObstacle(playerZ, entities, difficulty);
      const base = Math.max(0.7, 1.7 - difficulty * 0.07);
      this.nextObs = base + Math.random() * 0.7;
    }

    if (this.nextCar <= 0) {
      this._spawnCars(playerZ, entities, difficulty);
      const base = Math.max(1.05, 2.8 - difficulty * 0.12);
      this.nextCar = base + Math.random() * 1.15;
    }

    if (this.nextCoin <= 0) {
      this._spawnCoins(playerZ, entities);
      this.nextCoin = 0.45 + Math.random() * 0.55;
    }
  }

  _spawnObstacle(playerZ, entities, difficulty) {
    // Close enough to read down the road, far enough to react
    const z = playerZ + 28 + Math.random() * 10;
    const lane = Math.floor(Math.random() * 3);
    const roll = Math.random();
    let kind;
    if (roll < 0.28) kind = 'sign';
    else if (roll < 0.5) kind = 'crate';
    else if (roll < 0.72) kind = 'barrier';
    else kind = 'cone';

    if (!laneOccupied(entities, lane, z, 4.5)) {
      entities.push(makeObstacle(z, lane, kind));
    }
    if (difficulty > 4 && Math.random() < 0.3) {
      const otherLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
      const second = kind === 'sign' ? 'crate' : 'sign';
      const z2 = z + 4 + Math.random() * 3;
      if (!laneOccupied(entities, otherLane, z2, 4.5)) {
        entities.push(makeObstacle(z2, otherLane, second));
      }
    }
  }

  _spawnCars(playerZ, entities, difficulty) {
    // Spawn well ahead — closing speed is player + oncoming, so they need more runway
    const z = playerZ + 48 + difficulty * 2.4 + Math.random() * 16;
    const lanes = [0, 1, 2];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = tmp;
    }

    const wave = difficulty > 5 && Math.random() < 0.38 ? 2 : 1;
    let spawned = 0;
    for (const lane of lanes) {
      if (spawned >= wave) break;
      // Never fill every lane at the same depth — always leave an escape
      const zOff = spawned * (12 + Math.random() * 8);
      const zz = z + zOff;
      if (laneOccupied(entities, lane, zz, 6.5)) continue;
      entities.push(makeCar(zz, lane, pickCarStyle(difficulty)));
      spawned += 1;
    }
  }

  _spawnCoins(playerZ, entities) {
    const z0 = playerZ + 32 + Math.random() * 6;
    const lane = Math.floor(Math.random() * 3);
    const pattern = Math.floor(Math.random() * 3);
    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      let h = 0.9;
      let L = lane;
      if (pattern === 1) h = 0.9 + Math.sin(i * 0.7) * 0.7;
      if (pattern === 2) L = (lane + (i % 2)) % 3;
      entities.push(makeCoin(z0 + i * 1.4, L, h));
    }
  }
}
