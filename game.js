class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.gameState = 'menu';
    this.currentChapter = 1;
    this.deltaTime = 0;
    this.lastFrameTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;

    this.player = null;
    this.enemies = [];
    this.npcs = [];
    this.particles = [];

    this.cameraX = 0;
    this.cameraY = 0;

    this.keys = {};
    this.dialogueManager = new DialogueManager();
    this.settings = GameUtils.getSettings();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupMenuButtons();
    this.createWorld();
    this.gameLoop();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  setupMenuButtons() {
    const btnNewGame = document.getElementById('btnNewGame');
    if (btnNewGame) {
      btnNewGame.addEventListener('click', () => {
        console.log('New Game clicked');
        this.newGame();
      });
    }
    
    document.getElementById('btnSettings').addEventListener('click', () => this.openSettings('main'));
    document.getElementById('btnResume').addEventListener('click', () => this.resume());
    document.getElementById('btnSettings2').addEventListener('click', () => this.openSettings('pause'));
    document.getElementById('btnMainMenu').addEventListener('click', () => this.returnToMainMenu());
    document.getElementById('btnBackSettings').addEventListener('click', () => this.backFromSettings());

    const sliders = ['masterVolume', 'musicVolume'];
    sliders.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          const textId = id + '-text';
          const textEl = document.getElementById(textId);
          if (textEl) textEl.textContent = e.target.value + '%';
          this.settings[id] = e.target.value;
          GameUtils.saveSettings(this.settings);
        });
      }
    });

    const checkboxes = ['screenshake', 'subtitles'];
    checkboxes.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          this.settings[id] = e.target.checked;
          GameUtils.saveSettings(this.settings);
        });
      }
    });
  }

  createWorld() {
    this.player = new Player(400, 300);

    this.npcs = [
      new NPC('elder', 'Elder', 300, 250, NPC_DIALOGUES['elder']),
      new NPC('merchant', 'Merchant', 500, 400, NPC_DIALOGUES['merchant']),
      new NPC('guard', 'Guard', 200, 500, NPC_DIALOGUES['guard'])
    ];

    this.enemies = [
      new Enemy('slime_1', 'Slime', 600, 300, { maxHealth: 20, attack: 3, defense: 1 }),
      new Enemy('goblin_1', 'Goblin', 700, 400, { maxHealth: 30, attack: 5, defense: 2 })
    ];

    this.updateHUD();
  }

  newGame() {
    console.log('Starting new game...');
    this.gameState = 'playing';
    this.player = new Player(400, 300);
    this.createWorld();
    
    // Hide menu screens
    const mainMenu = document.getElementById('mainMenu');
    const settingsMenu = document.getElementById('settingsMenu');
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (mainMenu) mainMenu.style.display = 'none';
    if (settingsMenu) settingsMenu.style.display = 'none';
    if (loadingScreen) loadingScreen.style.display = 'none';
    
    // Show game canvas
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) gameContainer.style.display = 'block';
    
    console.log('Game state:', this.gameState);
    GameUtils.showNotification('Game Started! Use WASD or Arrow Keys to move', 'success', 3000);
  }

  resume() {
    this.gameState = 'playing';
    document.getElementById('pauseMenu').classList.add('hidden');
  }

  openSettings(from) {
    document.getElementById('settingsMenu').classList.remove('hidden');
  }

  backFromSettings() {
    document.getElementById('settingsMenu').classList.add('hidden');
    if (this.gameState === 'paused') {
      document.getElementById('pauseMenu').classList.remove('hidden');
    }
  }

  returnToMainMenu() {
    this.gameState = 'menu';
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('mainMenu').style.display = 'block';
    this.player = null;
    this.enemies = [];
    this.npcs = [];
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  onKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;

    if (e.key === 'Escape') {
      if (this.gameState === 'playing') {
        this.gameState = 'paused';
        document.getElementById('pauseMenu').classList.remove('hidden');
      } else if (this.gameState === 'paused') {
        this.resume();
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (this.gameState === 'playing') this.interactWithNearby();
    } else if (e.key >= '1' && e.key <= '4' && this.gameState === 'playing') {
      const idx = parseInt(e.key) - 1;
      this.player.castSpell(idx);
    }
  }

  onKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  interactWithNearby() {
    for (let npc of this.npcs) {
      if (npc.canInteract(this.player)) {
        const dialogue = DIALOGUES[npc.id];
        if (dialogue) {
          const node = this.dialogueManager.startDialogue(dialogue);
          this.dialogueManager.display(node);
        } else {
          const text = npc.getDialogue();
          GameUtils.showNotification(`${npc.name}: ${text}`, 'info', 3000);
        }
        break;
      }
    }
  }

  handlePlayerMovement() {
    if (!this.player) return;
    
    let dx = 0, dy = 0;
    if (this.keys['arrowup'] || this.keys['w']) dy = -1;
    if (this.keys['arrowdown'] || this.keys['s']) dy = 1;
    if (this.keys['arrowleft'] || this.keys['a']) dx = -1;
    if (this.keys['arrowright'] || this.keys['d']) dx = 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    if (dx !== 0 || dy !== 0) {
      this.player.move(dx, dy);
    }

    this.player.x = GameUtils.clamp(this.player.x, 0, 1600);
    this.player.y = GameUtils.clamp(this.player.y, 0, 1200);
  }

  updateGame(dt) {
    if (this.gameState !== 'playing') return;
    if (!this.player) return;

    this.handlePlayerMovement();
    this.player.update(dt);

    this.enemies.forEach(enemy => {
      enemy.updateAI(this.player, dt);
      enemy.update(dt);
    });

    this.npcs.forEach(npc => npc.update(dt));
    this.updateCamera();
    this.updateHUD();
  }

  updateCamera() {
    if (!this.player) return;
    this.cameraX = this.player.x - this.width / 2;
    this.cameraY = this.player.y - this.height / 2;
    this.cameraX = GameUtils.clamp(this.cameraX, 0, 1600 - this.width);
    this.cameraY = GameUtils.clamp(this.cameraY, 0, 1200 - this.height);
  }

  updateHUD() {
    if (!this.player) return;
    
    const hPercent = (this.player.health / this.player.maxHealth) * 100;
    document.getElementById('healthBar').style.width = hPercent + '%';
    document.getElementById('healthText').textContent = Math.floor(this.player.health) + '/' + this.player.maxHealth;

    const mPercent = (this.player.mana / this.player.maxMana) * 100;
    document.getElementById('manaBar').style.width = mPercent + '%';
    document.getElementById('manaText').textContent = Math.floor(this.player.mana) + '/' + this.player.maxMana;

    const sPercent = (this.player.stamina / this.player.maxStamina) * 100;
    document.getElementById('staminaBar').style.width = sPercent + '%';
    document.getElementById('staminaText').textContent = Math.floor(this.player.stamina) + '/' + this.player.maxStamina;

    document.getElementById('levelText').textContent = this.player.level;

    const spellSlots = document.querySelectorAll('.spell-slot');
    spellSlots.forEach((slot, i) => {
      const spell = this.player.spells[i];
      if (spell && spell.current > 0) {
        slot.classList.add('cooldown');
        slot.querySelector('.spell-cooldown').textContent = spell.current.toFixed(1) + 's';
      } else if (slot) {
        slot.classList.remove('cooldown');
      }
    });
  }

  render() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.gameState !== 'playing' && this.gameState !== 'paused') return;

    this.drawBackground();
    this.drawWorld();
    this.drawFPS();
  }

  drawBackground() {
    const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, '#0f3460');
    grad.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawWorld() {
    if (!this.player) return;
    
    const ox = -this.cameraX;
    const oy = -this.cameraY;

    this.ctx.strokeStyle = '#f39c12';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(ox, oy, 1600, 1200);

    this.enemies.forEach(e => e.draw(this.ctx, ox, oy));
    this.npcs.forEach(n => {
      n.draw(this.ctx, ox, oy);
      const d = GameUtils.distance(this.player.x, this.player.y, n.x, n.y);
      if (d < 100) {
        this.ctx.fillStyle = '#f39c12';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('!', n.x + ox + 10, n.y + oy - 20);
      }
    });

    this.player.draw(this.ctx, ox, oy);
  }

  drawFPS() {
    this.ctx.fillStyle = '#f39c12';
    this.ctx.font = '12px Arial';
    this.ctx.fillText('FPS: ' + Math.round(this.fps), 10, 20);
  }

  gameLoop = (now) => {
    this.deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.016);
    this.lastFrameTime = now;
    this.fps = 1 / this.deltaTime;

    this.updateGame(this.deltaTime);
    this.render();

    this.frameCount++;
    requestAnimationFrame(this.gameLoop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('loaded');
  }, 2500);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.log('SW failed:', err));
  }

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) installPrompt.classList.remove('hidden');
  });

  const btnInstallYes = document.getElementById('btnInstallYes');
  if (btnInstallYes) {
    btnInstallYes.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt = null;
        const installPrompt = document.getElementById('installPrompt');
        if (installPrompt) installPrompt.classList.add('hidden');
      }
    });
  }

  const btnInstallNo = document.getElementById('btnInstallNo');
  if (btnInstallNo) {
    btnInstallNo.addEventListener('click', () => {
      const installPrompt = document.getElementById('installPrompt');
      if (installPrompt) installPrompt.classList.add('hidden');
    });
  }

  const game = new Game();
  window.game = game;
  console.log('Game initialized:', game);
});
