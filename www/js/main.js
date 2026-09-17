import { Renderer } from './render.js?v=ss-play-7';
import { Game } from './game.js?v=ss-play-7';
import { Input } from './input.js?v=ss-play-7';
import { AudioBus } from './audio.js?v=ss-play-7';
import { recordRunForUser, setMutedForUser, buyCharacter, equipCharacter } from './storage.js?v=ss-play-7';
import {
  ensureLocalPlayer,
  getCurrentUser,
  setMemoryUser,
} from './auth.js?v=ss-play-7';
import { CHARACTERS, getCharacter } from './catalog.js?v=ss-play-7';

const $ = (sel) => document.querySelector(sel);

const canvas = $('#game');
const overlay = $('#overlay');
const hud = $('#hud');
const touchZones = $('#touch-zones');

const menuPanel = $('#menu-panel');
const storePanel = $('#store-panel');
const howPanel = $('#how-panel');
const pausePanel = $('#pause-panel');
const overPanel = $('#over-panel');

const renderer = new Renderer(canvas);
const audio = new AudioBus();
const game = new Game(renderer, audio);
const input = new Input($('#app'));

// Always have a local player — no sign-in required
let user = ensureLocalPlayer();
let startingRun = false;
let wasOver = false;

function allPanels() {
  return [menuPanel, storePanel, howPanel, pausePanel, overPanel];
}

function showPanel(panel) {
  allPanels().forEach((p) => {
    if (p) p.classList.add('hidden');
  });
  if (panel) panel.classList.remove('hidden');
}

function setOverlayMode(mode) {
  if (mode === 'playing') {
    overlay.classList.add('playing');
    overlay.classList.remove('hidden');
    showPanel(null);
    if (menuPanel) menuPanel.classList.add('hidden');
    hud.classList.remove('hidden');
    touchZones.classList.remove('hidden');
    return;
  }
  overlay.classList.remove('playing');
  overlay.classList.remove('hidden');
  hud.classList.add('hidden');
  touchZones.classList.add('hidden');
  if (mode === 'menu') showPanel(menuPanel);
  if (mode === 'store') showPanel(storePanel);
  if (mode === 'how') showPanel(howPanel);
  if (mode === 'pause') showPanel(pausePanel);
  if (mode === 'over') showPanel(overPanel);
}

function applyUser() {
  user = getCurrentUser() || user;
  if (!user) user = ensureLocalPlayer();
  setMemoryUser(user);
  game.setProfile(user);
  audio.setMuted(!!user.muted);
  updateMuteBtn();
  renderer.setPlayerCharacter(getCharacter(user.equipped || 'runner'));
  return user;
}

function refreshMenu() {
  applyUser();
  if (!user) return;
  const walletEl = $('#menu-wallet');
  const bestEl = $('#best-distance');
  const runnerEl = $('#menu-runner');
  if (walletEl) walletEl.textContent = String(Math.floor(user.wallet || 0));
  if (bestEl) bestEl.textContent = `${Math.floor(user.bestDistance || 0)} m`;
  if (runnerEl) runnerEl.textContent = getCharacter(user.equipped).name;
}

function updateMuteBtn() {
  const btn = $('#btn-mute');
  if (btn) btn.textContent = audio.muted ? '🔇' : '🔊';
}

function updateHud() {
  const d = $('#hud-distance');
  const c = $('#hud-coins');
  if (d) d.textContent = `${Math.floor(game.distance)} m`;
  if (c) c.textContent = `${Math.floor(game.coins)}`;
  const ratio = Math.max(0, Math.min(1, game.cop.getGapRatio()));
  const fill = $('#chase-fill');
  const youIcon = document.querySelector('.chase-icon.you');
  if (fill) fill.style.width = `${Math.max(8, ratio * 100)}%`;
  if (youIcon) youIcon.style.left = `${Math.max(8, ratio * 100)}%`;
}

function renderStore() {
  applyUser();
  if (!user) return;
  const walletEl = $('#store-wallet');
  if (walletEl) walletEl.textContent = String(Math.floor(user.wallet || 0));
  const grid = $('#store-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const c of CHARACTERS) {
    const owned = (user.unlocked || []).includes(c.id);
    const equipped = user.equipped === c.id;
    const card = document.createElement('div');
    card.className = 'store-card' + (equipped ? ' equipped' : '');
    card.innerHTML = `
      <div class="store-swatch" style="background: linear-gradient(135deg, #${c.color.toString(16).padStart(6, '0')}, #${c.accent.toString(16).padStart(6, '0')})"></div>
      <div class="store-info">
        <div class="store-name-row">
          <strong>${c.name}</strong>
          <span class="store-badge">${c.badge}</span>
        </div>
        <p>${c.desc}</p>
        <div class="store-stats">
          SPD ${(c.stats.speed * 100 - 100 >= 0 ? '+' : '')}${Math.round((c.stats.speed - 1) * 100)}%
          · COIN +${Math.round((c.stats.coinBonus - 1) * 100)}%
          · GAP +${Math.round((c.stats.gapBonus - 1) * 100)}%
        </div>
      </div>
      <div class="store-actions">
        ${
          equipped
            ? `<button type="button" class="btn btn-primary btn-sm" disabled>EQUIPPED</button>`
            : owned
              ? `<button type="button" class="btn btn-primary btn-sm" data-equip="${c.id}">EQUIP</button>`
              : `<button type="button" class="btn btn-store btn-sm" data-buy="${c.id}">BUY ${c.price}</button>`
        }
      </div>
    `;
    grid.appendChild(card);
  }

  grid.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.buy;
      const ch = getCharacter(id);
      const res = buyCharacter(user, id, ch.price);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      user = res.profile;
      setMemoryUser(user);
      audio.coin();
      renderStore();
      refreshMenu();
    });
  });

  grid.querySelectorAll('[data-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const res = equipCharacter(user, btn.dataset.equip);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      user = res.profile;
      setMemoryUser(user);
      game.setProfile(user);
      renderer.setPlayerCharacter(getCharacter(user.equipped));
      audio.ui();
      renderStore();
      refreshMenu();
    });
  });
}

/**
 * Start a run immediately from the menu or game-over screen.
 */
async function startGame() {
  if (startingRun) return true;
  startingRun = true;
  try {
    applyUser();
    if (!user) return false;

    setOverlayMode('playing');
    game.startRun();

    try {
      await audio.unlock();
    } catch {
      /* audio optional */
    }
    try {
      audio.ui();
    } catch {
      /* ignore */
    }

    if (game.phase !== 'playing') {
      game.phase = 'playing';
      game.runStarted = true;
    }
    setOverlayMode('playing');
    wasOver = false;
    return true;
  } catch (err) {
    console.error('startGame failed', err);
    return false;
  } finally {
    startingRun = false;
  }
}

function pauseGame() {
  if (game.phase !== 'playing') return;
  game.pause();
  setOverlayMode('pause');
  audio.ui();
}

function resumeGame() {
  game.resume();
  setOverlayMode('playing');
  audio.ui();
}

function quitToMenu() {
  game.toMenu();
  refreshMenu();
  setOverlayMode('menu');
  audio.ui();
}

function openStore() {
  applyUser();
  audio.ui();
  renderStore();
  setOverlayMode('store');
}

function showGameOver() {
  applyUser();
  if (!user) {
    setOverlayMode('menu');
    return;
  }
  const { profile, isRecord, earned } = recordRunForUser(
    user,
    game.distance,
    game.coins,
    game.score
  );
  user = profile || user;
  setMemoryUser(user);
  game.setProfile(user);
  const reason = $('#over-reason');
  const dist = $('#over-distance');
  const coins = $('#over-coins');
  const earn = $('#over-earned');
  if (reason) reason.textContent = game.overReason;
  if (dist) dist.textContent = `${Math.floor(game.distance)} m`;
  if (coins) coins.textContent = `${Math.floor(game.coins)}`;
  if (earn) earn.textContent = `+${earned}`;
  const rec = $('#new-record');
  if (rec) {
    if (isRecord) rec.classList.remove('hidden');
    else rec.classList.add('hidden');
  }
  setOverlayMode('over');
  refreshMenu();
}

// Menu / game buttons
$('#btn-play')?.addEventListener('click', () => startGame());
$('#btn-store')?.addEventListener('click', openStore);
$('#btn-store-back')?.addEventListener('click', () => {
  refreshMenu();
  setOverlayMode('menu');
  audio.ui();
});
$('#btn-how')?.addEventListener('click', () => {
  audio.ui();
  setOverlayMode('how');
});
$('#btn-how-back')?.addEventListener('click', () => {
  audio.ui();
  setOverlayMode('menu');
});
$('#btn-resume')?.addEventListener('click', resumeGame);
$('#btn-quit')?.addEventListener('click', quitToMenu);
$('#btn-retry')?.addEventListener('click', () => startGame());
$('#btn-menu')?.addEventListener('click', quitToMenu);
$('#btn-over-store')?.addEventListener('click', openStore);
$('#btn-pause')?.addEventListener('click', pauseGame);
$('#btn-mute')?.addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  if (user) setMutedForUser(user, audio.muted);
  updateMuteBtn();
  audio.ui();
});

function onResize() {
  renderer.resize();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 100));
onResize();

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') pauseGame();
});

// Main loop
let last = performance.now();

function frame(now) {
  const dt = (now - last) / 1000;
  last = now;

  input.update();

  if (game.phase === 'playing' && input.pausePressed) pauseGame();
  else if (game.phase === 'paused' && input.pausePressed) resumeGame();

  if (input.keys.has('KeyM') && !frame._m) {
    frame._m = true;
    audio.setMuted(!audio.muted);
    if (user) setMutedForUser(user, audio.muted);
    updateMuteBtn();
  }
  if (!input.keys.has('KeyM')) frame._m = false;

  game.update(dt, input);
  renderer.draw(game.state);

  if (game.phase === 'playing') updateHud();

  if (game.phase === 'over' && !wasOver) showGameOver();
  wasOver = game.phase === 'over';

  requestAnimationFrame(frame);
}

// Boot — straight to main menu, ready to play
applyUser();
refreshMenu();
setOverlayMode('menu');
game.phase = 'menu';
requestAnimationFrame(frame);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.update()))
      .catch(() => {});
    navigator.serviceWorker.register('./sw.js?v=ss-play-7').catch(() => {});
  });
}
