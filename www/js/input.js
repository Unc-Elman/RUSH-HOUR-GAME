/** Keyboard + touch input (jump, slide, lanes) */
export class Input {
  constructor(root) {
    this.jumpPressed = false;
    this.slidePressed = false;
    this.leftPressed = false;
    this.rightPressed = false;
    this.pausePressed = false;
    this.slideHeld = false;
    this._jumpLatch = false;
    this._slideLatch = false;
    this._pauseLatch = false;
    this._leftLatch = false;
    this._rightLatch = false;
    this.keys = new Set();
    this.touchJump = false;
    this.touchSlide = false;

    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup', (e) => this._onKey(e, false));

    // Swipe support for mobile lanes
    let sx = 0;
    let sy = 0;
    let active = false;
    root.addEventListener(
      'pointerdown',
      (e) => {
        if (e.target.closest('button, .panel, .icon-btn, input, label, .store-card')) return;
        active = true;
        sx = e.clientX;
        sy = e.clientY;
        const rect = root.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // bottom third: left/right halves for lanes if swipe small; upper uses jump/slide zones
        if (x < rect.width * 0.5) this.touchSlide = true;
        else this.touchJump = true;
      },
      { passive: true }
    );
    root.addEventListener(
      'pointerup',
      (e) => {
        if (active) {
          const dx = e.clientX - sx;
          const dy = e.clientY - sy;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) this._swipeLeft = true;
            else this._swipeRight = true;
          }
        }
        active = false;
        this.touchJump = false;
        this.touchSlide = false;
      },
      { passive: true }
    );
    root.addEventListener(
      'pointercancel',
      () => {
        active = false;
        this.touchJump = false;
        this.touchSlide = false;
      },
      { passive: true }
    );

    this._swipeLeft = false;
    this._swipeRight = false;
  }

  _onKey(e, down) {
    const k = e.code;
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyP', 'Escape'].includes(
        k
      )
    ) {
      e.preventDefault();
    }
    if (down) this.keys.add(k);
    else this.keys.delete(k);
  }

  update() {
    const jumpDown =
      this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.touchJump;
    const slideDown =
      this.keys.has('ArrowDown') || this.keys.has('KeyS') || this.touchSlide;
    const leftDown = this.keys.has('ArrowLeft') || this.keys.has('KeyA') || this._swipeLeft;
    const rightDown = this.keys.has('ArrowRight') || this.keys.has('KeyD') || this._swipeRight;
    const pauseDown = this.keys.has('KeyP') || this.keys.has('Escape');

    this.jumpPressed = jumpDown && !this._jumpLatch;
    this.slidePressed = slideDown && !this._slideLatch;
    this.leftPressed = leftDown && !this._leftLatch;
    this.rightPressed = rightDown && !this._rightLatch;
    this.pausePressed = pauseDown && !this._pauseLatch;
    this.slideHeld = slideDown;

    this._jumpLatch = jumpDown;
    this._slideLatch = slideDown;
    this._leftLatch = leftDown;
    this._rightLatch = rightDown;
    this._pauseLatch = pauseDown;

    this._swipeLeft = false;
    this._swipeRight = false;
  }
}
