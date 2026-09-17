import { Player, Cop, Spawner, aabb3, makeParticle } from './entities.js';
import { getCharacter } from './catalog.js';

export class Game {
  constructor(renderer, audio) {
    this.renderer = renderer;
    this.audio = audio;
    this.player = new Player();
    this.cop = new Cop();
    this.spawner = new Spawner();
    this.entities = [];
    this.particles = [];
    this.phase = 'menu'; // menu | playing | paused | over
    this.time = 0;
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.speed = 12;
    this.baseSpeed = 12;
    this.nearMissBoost = 0;
    this.coinCombo = 0;
    this.comboTimer = 0;
    this.overReason = 'Bumped an obstacle — the cop caught you.';
    this.difficulty = 0;
    this.runStarted = false;
    this._lastStep = 0;
    this.character = getCharacter('runner');
    this.profile = null;
  }

  setProfile(profile) {
    this.profile = profile;
    this.character = getCharacter(profile?.equipped || 'runner');
  }

  get state() {
    return {
      phase: this.phase,
      player: this.player,
      cop: this.cop,
      entities: this.entities,
      particles: this.particles,
      time: this.time,
      speed: this.speed,
      character: this.character,
      distance: this.distance,
    };
  }

  startRun() {
    this.character = getCharacter(this.profile?.equipped || 'runner');
    this.player.reset();
    this.player.jumpMul = this.character.stats.jump || 1;
    this.cop.reset();
    this.cop.x = this.player.x;
    this.spawner.reset();
    this.entities = [];
    this.particles = [];
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.speed = this.baseSpeed * (this.character.stats.speed || 1);
    this.nearMissBoost = 0;
    this.coinCombo = 0;
    this.comboTimer = 0;
    this.difficulty = 0;
    this.time = 0;
    this.phase = 'playing';
    this.runStarted = true;
    this.overReason = 'Bumped an obstacle — the cop caught you.';
    this.audio.startMusic();
    this.renderer?.onRunStart?.();
  }

  pause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.audio.stopMusic();
    }
  }

  resume() {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.audio.startMusic();
    }
  }

  toMenu() {
    this.phase = 'menu';
    this.audio.stopMusic();
  }

  endRun(reason) {
    if (this.phase !== 'playing') return;
    this.phase = 'over';
    this.overReason = reason;
    this.player.alive = false;
    this.score = Math.floor(this.distance * 1.2 + this.coins * 25 + this.difficulty * 10);
    this.audio.stopMusic();
    this.audio.caught();
    this.renderer?.addShake?.(0.35);
    this.renderer?.addFlash?.(0.4);
  }

  update(dt, input) {
    dt = Math.min(dt, 0.05);
    this.time += dt;

    if (this.phase === 'menu') {
      this.player.z += 6 * dt;
      this.player.anim += dt * 10;
      this.player.x = 0;
      this.player.targetX = 0;
      this.player.lane = 1;
      this.cop.gap = 12 + Math.sin(this.time) * 1.5;
      this.cop.anim += dt * 10;
      this.cop.x += (this.player.x - this.cop.x) * 0.05;
      if (this.entities.length < 20) {
        this.spawner.update(dt * 0.5, this.player.z, this.entities, 1);
      }
      this._updateTraffic(dt);
      this.entities = this.entities.filter((e) => e.z > this.player.z - 16);
      this._updateParticles(dt);
      return;
    }

    if (this.phase !== 'playing') return;

    if (input.jumpPressed && this.player.jump()) this.audio.jump();
    if (input.slidePressed || (input.slideHeld && this.player.onGround && !this.player.sliding)) {
      if (this.player.startSlide()) this.audio.slide();
    }
    // Chase cam looks along +Z (right-handed Y-up), so world +X is screen-left.
    if (input.leftPressed) this.player.setLane(1);
    if (input.rightPressed) this.player.setLane(-1);

    const stats = this.character.stats;
    this.difficulty = this.distance / 100;
    this.speed =
      this.baseSpeed * (stats.speed || 1) +
      Math.min(18, this.distance * 0.04 + this.difficulty * 0.35);

    this.player.z += this.speed * dt;
    this.distance += this.speed * dt * 0.35;

    this.player.update(dt);
    this.cop.x += (this.player.x - this.cop.x) * Math.min(1, 4.2 * dt);

    if (this.player.landed) {
      this.audio.land(this.player.landImpact || 0.4);
      this.renderer?.addShake?.(0.06 + (this.player.landImpact || 0) * 0.12);
      const n = 3 + Math.floor((this.player.landImpact || 0) * 5);
      for (let i = 0; i < n; i++) {
        this.particles.push(makeParticle(this.player.x, 0.05, this.player.z, '#8a8478'));
      }
    }
    if (this.player.onGround && !this.player.sliding) {
      const step = Math.sin(this.player.anim);
      if (this._lastStep <= 0.15 && step > 0.15) this.audio.footstep();
      this._lastStep = step;
    } else {
      this._lastStep = 0;
    }

    this.nearMissBoost = Math.max(0, this.nearMissBoost - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.coinCombo = 0;

    this.cop.pressure = Math.min(1, this.difficulty / 12);
    this.cop.update(dt, this.speed, this.nearMissBoost, stats.gapBonus || 1);
    this.audio.setMusicIntensity(Math.min(1, (this.speed - this.baseSpeed) / 20));

    this.spawner.update(dt, this.player.z, this.entities, this.difficulty);
    this._updateTraffic(dt);

    const hb = this.player.hitbox;
    const magnet = 0.15 + (stats.coinBonus > 1.2 ? 0.35 : 0);

    for (const e of this.entities) {
      if (e.type === 'coin' && !e.collected) {
        e.spin += dt * 6;
        const coinBox = {
          x: e.x - e.r - magnet,
          y: e.y - e.r,
          z: e.z - e.r,
          w: e.r * 2 + magnet * 2,
          h: e.r * 2,
          d: e.r * 2,
        };
        if (aabb3(hb, coinBox)) {
          e.collected = true;
          this.coinCombo += 1;
          this.comboTimer = 1.2;
          const gain = Math.max(1, Math.round((1 + Math.floor(this.coinCombo / 5)) * (stats.coinBonus || 1)));
          this.coins += gain;
          this.audio.coin();
          for (let i = 0; i < 6; i++) {
            this.particles.push(makeParticle(e.x, e.y, e.z, '#ffd56a'));
          }
          this.cop.gap = Math.min(this.cop.maxGap, this.cop.gap + 0.35 * (stats.gapBonus || 1));
        }
      }

      if (e.type === 'obstacle') {
        const box = {
          x: e.x - e.w / 2,
          y: e.y,
          z: e.z - e.d / 2,
          w: e.w,
          h: e.h,
          d: e.d,
        };
        const nearPadZ = e.kind === 'car' ? 1.5 : 0.6;
        const near = {
          x: box.x - 0.35,
          y: box.y,
          z: box.z - nearPadZ,
          w: box.w + 0.7,
          h: box.h + 0.3,
          d: box.d + nearPadZ * 2,
        };

        if (!e._near && aabb3(hb, near) && !aabb3(hb, box)) {
          e._near = true;
          this.nearMissBoost = Math.min(1.2, this.nearMissBoost + (e.kind === 'car' ? 0.8 : 0.55));
          this.cop.gap = Math.min(
            this.cop.maxGap,
            this.cop.gap + (e.kind === 'car' ? 2.1 : 1.6) * (stats.gapBonus || 1)
          );
          if (e.kind === 'car') this.audio.carPass();
          else this.audio.nearMiss();
          this.renderer?.addShake?.(e.kind === 'car' ? 0.18 : 0.12);
          for (let i = 0; i < (e.kind === 'car' ? 8 : 4); i++) {
            this.particles.push(makeParticle(e.x, e.y + 0.5, e.z, e.kind === 'car' ? '#ffe8a0' : '#a0c4ff'));
          }
        }

        if (aabb3(hb, box)) {
          let canPass;
          if (e.kind === 'car') {
            // Low cars can be jumped if you clear the roof; SUVs/pickups cannot
            const roof = box.y + box.h * (e.requires === 'jump' ? 0.82 : 0.98);
            canPass = !this.player.onGround && hb.y > roof;
          } else {
            canPass =
              (e.requires === 'slide' && this.player.sliding) ||
              (e.requires === 'jump' && !this.player.onGround && hb.y > box.y + box.h * 0.45);
          }

          // Cop only catches you when you actually bump an obstacle
          if (!canPass && this.player.invuln <= 0) {
            this.audio.hit();
            this.renderer?.addShake?.(0.28);
            this.renderer?.addFlash?.(0.25);
            this.cop.gap = this.cop.minGap;
            this.cop.catching = true;
            for (let i = 0; i < 12; i++) {
              this.particles.push(
                makeParticle(this.player.x, this.player.y + 0.8, this.player.z, '#ff6b6b')
              );
            }
            this.endRun(
              e.kind === 'car'
                ? 'Hit by oncoming traffic — the cop caught you.'
                : e.kind === 'sign'
                  ? 'Hit a low sign — the cop caught you.'
                  : 'Bumped an obstacle — the cop caught you.'
            );
            break;
          }
        }
      }
    }

    this.entities = this.entities.filter((e) => {
      if (e.type === 'coin' && e.collected) return false;
      return e.z > this.player.z - 16;
    });

    this._updateParticles(dt);
  }

  _updateTraffic(dt) {
    for (const e of this.entities) {
      if (e.kind !== 'car') continue;
      e.z -= e.speed * dt;
      e.wheelSpin = (e.wheelSpin || 0) + (e.speed / (e.wheelR || 0.33)) * dt;
      e.yaw = Math.sin(e.z * 0.08 + e.id) * 0.018;
    }
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 12 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
}
