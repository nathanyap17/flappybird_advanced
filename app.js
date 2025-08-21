/**
 * Flappy Bird Clone: Enhanced Phaser 3 game with bird navigating scrolling columns.
 * Controls: Space to start, Up to flap, Left/Right to move, P to pause/resume, R to restart.
 * Features: Random gap positions, static horizontal columns, score/high score, bird animation,
 * day/night cycle, weather effects, power-ups (with intro), achievements, shield graphics,
 * pause/resume overlay, and improved game-over with reason display.
 * A standalone JavaScript exercise for Codédex React Valley portfolio.
 */

function preload() {
  // Load assets
  this.load.image('background', 'assets/background.png');
  this.load.image('road', 'assets/road.png');
  this.load.image('column', 'assets/column.png');
  this.load.spritesheet('bird', 'assets/bird.png', { frameWidth: 64, frameHeight: 96 });
  this.load.image('powerup', 'assets/powerup.png');
  this.load.image('rain', 'assets/rain.png');

  // Log asset loading status
  this.load.on('filecomplete-spritesheet-bird', () => {
    console.log('Bird spritesheet loaded successfully');
  });
  this.load.on('fileerror', (file) => {
    console.error(`Failed to load asset: ${file.key} at ${file.src}`);
  });
}

function create() {
  // Background
  this.background = this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);

  // Ground
  this.roads = this.physics.add.staticGroup();
  this.roads.create(400, 568, 'road').setScale(2).refreshBody().setDepth(0);

  // Column groups
  this.topColumns = this.physics.add.group({ allowGravity: false, immovable: true }).setDepth(0);
  this.bottomColumns = this.physics.add.group({ allowGravity: false, immovable: true }).setDepth(0);

  // Bird
  this.bird = this.physics.add.sprite(100, 300, 'bird').setScale(2).setDepth(1);
  this.bird.setBounce(0.2);
  this.bird.setCollideWorldBounds(true);

  // Bird animation
  const birdTexture = this.textures.get('bird');
  if (birdTexture.frameTotal > 1) {
    this.anims.create({
      key: 'flap',
      frames: this.anims.generateFrameNumbers('bird', { start: 0, end: Math.min(2, birdTexture.frameTotal - 2) }),
      frameRate: 10,
      repeat: -1
    });
    this.bird.play('flap');
    console.log('Bird animation created');
  } else {
    console.warn('Bird spritesheet has only one frame; animation skipped');
  }

  // Game state
  this.isGameStarted = false;
  this.hasLanded = false;
  this.hasBumped = false;
  this.isShielded = false;
  this.shieldTimeRemaining = 0;
  this.score = 0;
  this.highScore = localStorage.getItem('flappyHighScore') || 0;
  this.scoreMultiplier = 1;
  this.gameTimer = 0;
  this.isPaused = false;

  // Input
  this.cursors = this.input.keyboard.createCursorKeys();
  this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

  // Score display
  this.scoreText = this.add.text(16, 20, 'Score: 0', {
    fontFamily: '"Comic Sans MS", Times, serif',
    fontSize: '20px',
    color: 'black',
    backgroundColor: 'white',
    padding: { x: 10, y: 5 }
  }).setDepth(2);
  this.highScoreText = this.add.text(16, 60, `High Score: ${this.highScore}`, {
    fontFamily: '"Comic Sans MS", Times, serif',
    fontSize: '20px',
    color: 'black',
    backgroundColor: 'white',
    padding: { x: 10, y: 5 }
  }).setDepth(2);

  // Instructions with power-up intro - separated into two text objects
  this.messageToPlayer = this.add.text(400, 500, 'Press SPACE to start\nUse UP to flap, LEFT/RIGHT to move, P to pause', {
    fontFamily: '"Comic Sans MS", Times, serif',
    fontSize: '22px',
    color: 'black',
    backgroundColor: 'white',
    padding: { x: 15, y: 10 },
    align: 'center'
  }).setOrigin(0.5, 0.5).setDepth(2);

  // Separate power-up info text
  this.powerUpInfo = this.add.text(400, 550, 'Power-ups:', {
    fontFamily: '"Comic Sans MS", Times, serif',
    fontSize: '20px',
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: { x: 15, y: 10 },
    align: 'center'
  }).setOrigin(0.5, 0.5).setDepth(2);

  // Add colored power-up descriptions
  this.powerUpDesc = this.add.text(400, 590, '🛡️ Shield   ⏱️ Slow Time   💫 Double Points', {
    fontFamily: '"Comic Sans MS", Times, serif',
    fontSize: '18px',
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: { x: 15, y: 5 },
    align: 'center'
  }).setOrigin(0.5, 0.5).setDepth(2);

  // Keep the bottom alignment for main message
  Phaser.Display.Align.In.BottomCenter(this.messageToPlayer, this.background, 0, -80);

  // Game-over overlay
  this.gameOverOverlay = this.add.container(400, 300).setVisible(false).setDepth(4);
  const overlayBg = this.add.rectangle(0, 100, 220, 200, 0x000000, 0.7).setOrigin(0.5);
  const gameOverText = this.add.text(0, -100, 'GAME OVER', {
    fontSize: '48px',
    color: '#fff',
    align: 'center',
    fontFamily: '"Comic Sans MS", Times, serif'
  }).setOrigin(0.5);
  const restartBtn = this.add.text(0, 100, 'Restart', {
    fontSize: '24px',
    color: '#fff',
    backgroundColor: '#444',
    padding: { x: 25, y: 12 }
  }).setOrigin(0.5).setInteractive();
  const quitBtn = this.add.text(0, 150, 'Quit', {
    fontSize: '24px',
    color: '#fff',
    backgroundColor: '#444',
    padding: { x: 25, y: 12 }
  }).setOrigin(0.5).setInteractive();
  restartBtn.on('pointerdown', () => { this.scene.restart(); });
  quitBtn.on('pointerdown', () => { window.location.reload(); });
  this.gameOverOverlay.add([overlayBg, gameOverText, restartBtn, quitBtn]);

  // Pause overlay
  this.pauseOverlay = this.add.container(400, 300).setVisible(false).setDepth(4);
  const pauseBg = this.add.rectangle(0, 0, 400, 250, 0x000000, 0.7).setOrigin(0.5);
  const pauseText = this.add.text(0, -80, 'PAUSED', {
    fontSize: '32px',
    color: '#fff'
  }).setOrigin(0.5);
  const resumeBtn = this.add.text(0, 0, 'Resume', {
    fontSize: '24px',
    color: '#fff',
    backgroundColor: '#444',
    padding: { x: 20, y: 10 }
  }).setOrigin(0.5).setInteractive();
  const pauseQuitBtn = this.add.text(0, 60, 'Quit', {
    fontSize: '24px',
    color: '#fff',
    backgroundColor: '#444',
    padding: { x: 20, y: 10 }
  }).setOrigin(0.5).setInteractive();
  resumeBtn.on('pointerdown', () => {
    this.isPaused = false;
    this.physics.resume();
    this.time.paused = false;
    this.pauseOverlay.setVisible(false);
    this.messageToPlayer.setText('Use UP to flap, LEFT/RIGHT to move, P to pause, R to restart');
    console.log('Game resumed');
  });
  pauseQuitBtn.on('pointerdown', () => { window.location.reload(); });
  this.pauseOverlay.add([pauseBg, pauseText, resumeBtn, pauseQuitBtn]);

  // Shield graphics
  this.shieldCircle = this.add.graphics().setDepth(3);
  this.shieldTimerText = this.add.text(700, 100, '', {
    fontFamily: '"Comic Sans MS", Times, serif',
    fontSize: '20px',
    color: '#00ff00',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: { x: 10, y: 5 }
  }).setVisible(false).setDepth(3);

  // In the create function, replace the existing day/night cycle with this:
  this.daytime = true;
  this.tintController = { currentTint: 0xFFFFFF };
  this.background.setTint(this.tintController.currentTint);
  this.roads.getChildren().forEach(road => road.setTint(this.tintController.currentTint));
  this.dayNightCycle = this.time.addEvent({
    delay: 20000, // 20 seconds per cycle
    callback: () => {
      this.daytime = !this.daytime;
      const targetTint = this.daytime ? 0xFFFFFF : 0x555555;
      console.log(`Starting day/night transition to ${this.daytime ? 'day' : 'night'}`);
      this.tweens.add({
        targets: this.tintController,
        currentTint: targetTint,
        duration: 2000,
        ease: 'Linear',
        onUpdate: () => {
          const tintValue = Math.round(this.tintController.currentTint);
          this.background.setTint(tintValue);
          this.roads.getChildren().forEach(road => road.setTint(tintValue));
        },
        onComplete: () => {
          console.log(`Day/Night smoothly transitioned to ${this.daytime ? 'day' : 'night'}`);
        }
      });
    },
    loop: true
  });

  // Power-ups
  this.powerUpTypes = ['shield', 'slowTime', 'doublePoints'];
  this.powerUps = this.physics.add.group({ allowGravity: false }).setDepth(1);

  // Weather system
  this.particles = this.add.particles('rain');
  this.rainEmitter = this.particles.createEmitter({
    x: { min: 0, max: 800 },
    y: -10,
    lifespan: 2000,
    speedY: { min: 200, max: 400 },
    scale: { start: 0.1, end: 0.1 },
    quantity: 0,
    blendMode: 'ADD'
  });

  // Random weather changes
  this.time.addEvent({
    delay: 15000,
    callback: () => this.changeWeather(),
    loop: true
  });

  // Achievements
  this.achievements = {
    firstFlight: { earned: false, text: 'First Flight - Score your first point' },
    highFlyer: { earned: false, text: 'High Flyer - Score 10 points' },
    survivor: { earned: false, text: 'Survivor - Play for 1 minute' }
  };
  this.achievementText = this.add.text(400, 100, '', {
    fontSize: '28px',
    fontFamily: '"Comic Sans MS", Times, serif',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: { x: 15, y: 10 },
    fixedWidth: 500,
    align: 'center'
  }).setOrigin(0.5).setAlpha(0).setDepth(4);

  // Obstacle spawner
  this.spawnEvent = this.time.addEvent({
    delay: Phaser.Math.Between(1500, 2500),
    callback: () => this.spawnColumn(),
    loop: true,
    paused: true
  });

  // Power-up spawner
  this.time.addEvent({
    delay: 10000,
    callback: () => this.spawnPowerUp(),
    loop: true
  });

  // Scene methods
  this.spawnColumn = function() {
    if (!this.isGameStarted || this.hasLanded || this.hasBumped) return;

    const baseSpeed = -150;
    const speedIncrease = Math.min(this.score * 10, 200);
    const currentSpeed = baseSpeed - speedIncrease;
    const minGap = Math.max(120, 250 - this.score * 5);
    const gap = Phaser.Math.Between(minGap, minGap + 50);
    const columnY = Phaser.Math.Between(120, 450);

    const topColumn = this.topColumns.create(800, columnY - gap / 2, 'column').setOrigin(0, 1);
    const bottomColumn = this.bottomColumns.create(800, columnY + gap / 2, 'column').setOrigin(0, 0);
    topColumn.setVelocityX(currentSpeed);
    bottomColumn.setVelocityX(currentSpeed);

    console.log(`Spawned column pair at x: 800, y: ${columnY}, gap: ${gap}, speed: ${currentSpeed}`);

    const scoreZone = this.add.zone(800 + topColumn.width / 2, columnY, 1, gap);
    this.physics.world.enable(scoreZone);
    scoreZone.body.setAllowGravity(false);
    scoreZone.body.setVelocityX(currentSpeed);
    scoreZone.scored = false;

    this.physics.add.overlap(this.bird, scoreZone, () => {
      if (!scoreZone.scored) {
        this.score += this.scoreMultiplier;
        this.scoreText.setText(`Score: ${this.score}`);
        scoreZone.scored = true;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.highScoreText.setText(`High Score: ${this.highScore}`);
          localStorage.setItem('flappyHighScore', this.highScore);
        }
        this.spawnEvent.delay = Phaser.Math.Between(1500, 2500);
        this.checkAchievements();
      }
    });
  };

  this.spawnPowerUp = function() {
    if (!this.isGameStarted || this.hasLanded || this.hasBumped) return;

    const type = Phaser.Math.RND.pick(this.powerUpTypes);
    const powerUp = this.powerUps.create(800, Phaser.Math.Between(100, 500), 'powerup');
    powerUp.type = type;
    powerUp.setVelocityX(-100);
    powerUp.setScale(0.5);

    console.log(`Spawned power-up: ${type}`);

    switch (type) {
      case 'shield':
        powerUp.setTint(0x00ff00);
        this.physics.add.overlap(this.bird, powerUp, () => {
          this.isShielded = true;
          this.shieldTimeRemaining = 5000;
          this.bird.setTint(0x00ff00);
          this.shieldTimerText.setVisible(true);
          powerUp.destroy();
          this.time.delayedCall(5000, () => {
            this.isShielded = false;
            this.bird.clearTint();
            this.shieldTimerText.setVisible(false);
            console.log('Shield expired');
          });
        });
        break;
      case 'slowTime':
        powerUp.setTint(0x0000ff);
        this.physics.add.overlap(this.bird, powerUp, () => {
          const currentSpeed = this.topColumns.getChildren()[0]?.body.velocity.x || -150;
          this.topColumns.getChildren().forEach(c => c.setVelocityX(currentSpeed * 0.5));
          this.bottomColumns.getChildren().forEach(c => c.setVelocityX(currentSpeed * 0.5));
          powerUp.destroy();
          this.time.delayedCall(5000, () => this.resetColumnSpeed());
        });
        break;
      case 'doublePoints':
        powerUp.setTint(0xff0000);
        this.physics.add.overlap(this.bird, powerUp, () => {
          this.scoreMultiplier = 2;
          powerUp.destroy();
          this.time.delayedCall(5000, () => this.scoreMultiplier = 1);
        });
        break;
    }
  };

  this.resetColumnSpeed = function() {
    const baseSpeed = -150;
    const speedIncrease = Math.min(this.score * 10, 200);
    const currentSpeed = baseSpeed - speedIncrease;
    this.topColumns.getChildren().forEach(column => column.setVelocityX(currentSpeed));
    this.bottomColumns.getChildren().forEach(column => column.setVelocityX(currentSpeed));
    console.log(`Column speed reset to ${currentSpeed}`);
  };

  this.changeWeather = function() {
    if (!this.isGameStarted) return;
    const weather = Phaser.Math.RND.pick(['clear', 'rain', 'wind']);
    console.log(`Weather changed to ${weather}`);
    switch (weather) {
      case 'clear':
        this.rainEmitter.setQuantity(0);
        this.bird.setGravityY(300);
        break;
      case 'rain':
        this.rainEmitter.setQuantity(2);
        this.bird.setGravityY(300);
        break;
      case 'wind':
        this.rainEmitter.setQuantity(0);
        this.bird.setGravityY(400);
        break;
    }
  };

  this.checkAchievements = function() {
    if (this.score >= 1 && !this.achievements.firstFlight.earned) {
      this.unlockAchievement('firstFlight');
    }
    if (this.score >= 10 && !this.achievements.highFlyer.earned) {
      this.unlockAchievement('highFlyer');
    }
    if (this.gameTimer >= 60000 && !this.achievements.survivor.earned) {
      this.unlockAchievement('survivor');
    }
  };

  this.unlockAchievement = function(key) {
    this.achievements[key].earned = true;
    this.achievementText.setText(`Achievement Unlocked!\n${this.achievements[key].text}`);
    this.tweens.add({
      targets: this.achievementText,
      alpha: 1,
      y: 150,
      duration: 2000,
      ease: 'Power2',
      yoyo: true
    });
    console.log(`Achievement unlocked: ${key}`);
  };

  // Collision handlers
  this.physics.add.collider(this.bird, this.roads, () => {
    if (!this.isShielded) {
      this.hasLanded = true;
      this.handleGameOver('Crashed on ground!');
    }
  });

  this.physics.add.collider(this.bird, this.topColumns, () => {
    if (!this.isShielded) {
      this.hasBumped = true;
      this.handleGameOver('Hit the obstacle!');
    }
  });

  this.physics.add.collider(this.bird, this.bottomColumns, () => {
    if (!this.isShielded) {
      this.hasBumped = true;
      this.handleGameOver('Hit the obstacle!');
    }
  });

  // Game over handler
  this.handleGameOver = function(reason) {
    this.physics.pause();
    if (this.bird.anims) this.bird.anims.stop();
    
    // Update game over text
    const gameOverText = this.gameOverOverlay.list[1];
    gameOverText.setText('GAME OVER\n\n' + reason + '\n\nScore: ' + this.score);
    
    // Show message with fade-in
    this.messageToPlayer
      .setText('You lose. Try again!')
      .setStyle({
        color: '#ff0000',
        fontSize: '28px',
        fontFamily: '"Comic Sans MS", Times, serif',
        padding: { x: 25, y: 15 },
        align: 'center'
      })
      .setPosition(400, 260)
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: this.messageToPlayer,
      alpha: 1,
      duration: 500,
      ease: 'Power1'
    });
    
    // Display game over overlay
    this.gameOverOverlay.setVisible(true);
    
    // Stop all ongoing effects
    this.isShielded = false;
    this.shieldCircle.clear();
    this.shieldTimerText.setVisible(false);
    this.rainEmitter.setQuantity(0);
    
    console.log(`Game Over - ${reason}`);
  };
}

function update() {
  // Toggle pause
  if (Phaser.Input.Keyboard.JustDown(this.pauseKey) && this.isGameStarted && !this.hasLanded && !this.hasBumped) {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {

      this.physics.pause();
      this.time.paused = true;
      this.pauseOverlay.setVisible(true);
      
      // Update message position and make it visible
      this.messageToPlayer
        .setText('Use UP to flap, LEFT/RIGHT to move\nP to resume, R to restart')
        .setStyle({
          color: 'black',
          fontSize: '20px',
          fontFamily: '"Comic Sans MS", Times, serif',
          padding: { x: 25, y: 15 },
          align: 'center'
        })
        .setPosition(400, 100)  // Center of screen
        .setOrigin(0.5)
        .setVisible(true)       // Ensure visibility
        .setDepth(5);          // Above pause overlay 
      console.log('Game paused');
    } else {
      this.physics.resume();
      this.time.paused = false;
      this.pauseOverlay.setVisible(false);
      this.messageToPlayer.setVisible(false); // Hide message on resume
      console.log('Game resumed');
      }
    }

  // Start game - hide instructions when game starts
  if (this.cursors.space.isDown && !this.isGameStarted) {
    this.isGameStarted = true;
    this.messageToPlayer.setVisible(false);
    this.powerUpInfo.setVisible(true);
    this.powerUpDesc.setVisible(true);
    this.spawnEvent.paused = false;
    console.log('Game started - Instructions hidden');
  }

  // Skip updates if paused
  if (this.isPaused || this.hasLanded || this.hasBumped) {
    // Only allow restart after game over
    if (this.hasLanded || this.hasBumped) {
      if (!this.gameOverOverlay.visible) {
        const reason = this.hasLanded ? 'Crashed on ground!' : 'Hit the obstacle!';
        this.handleGameOver(reason);
      }
      
      if (this.restartKey.isDown) {
        this.scene.restart();
        console.log('Game restarted');
      }
    }
    return;
  }

  // Start game
  if (this.cursors.space.isDown && !this.isGameStarted) {
    this.isGameStarted = true;
    this.messageToPlayer.setText('Use UP to flap, LEFT/RIGHT to move, P to pause, R to restart');
    this.spawnEvent.paused = false;
  }

  // Hover before start
  if (!this.isGameStarted) {
    this.bird.setVelocityY(Math.sin(this.time.now / 200) * 20);
  }

  // Flap upward
  if (this.cursors.up.isDown && !this.hasLanded && !this.hasBumped) {
    this.bird.setVelocityY(-160);
  }

  // Horizontal movement
  if (this.isGameStarted && !this.hasLanded && !this.hasBumped) {
    if (this.cursors.left.isDown) {
      this.bird.setVelocityX(-50);
    } else if (this.cursors.right.isDown) {
      this.bird.setVelocityX(50);
    } else {
      this.bird.setVelocityX(0);
    }
    this.bird.x = Phaser.Math.Clamp(this.bird.x, 50, 750);
  } else {
    this.bird.setVelocityX(0);
  }

  // Update game timer
  if (this.isGameStarted && !this.hasLanded && !this.hasBumped) {
    this.gameTimer += this.game.loop.delta;
  }

  // Update shield graphics and timer
  if (this.isShielded) {
    this.shieldTimeRemaining -= this.game.loop.delta;
    this.shieldCircle.clear();
    this.shieldCircle.lineStyle(2, 0x00ff00, 1);
    this.shieldCircle.strokeCircle(this.bird.x, this.bird.y, 50);
    this.shieldTimerText.setText(`Shield: ${Math.ceil(this.shieldTimeRemaining / 1000)}s`);
  } else {
    this.shieldCircle.clear();
    this.shieldTimerText.setVisible(false);
  }

  // Clean up objects
  const cleanup = obj => {
    try {
      if (obj && obj.x < -50 && typeof obj.destroy === 'function') {
        obj.destroy();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cleanup error:', error);
      return false;
    }
  };
  this.topColumns.getChildren().forEach(cleanup);
  this.bottomColumns.getChildren().forEach(cleanup);
  this.powerUps.getChildren().forEach(cleanup);
  this.children.list.filter(obj => obj.type === 'Zone').forEach(cleanup);
}

// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
  scene: { preload, create, update },
  canvasStyle: 'willReadFrequently: true'
};

// Initialize game
const game = new Phaser.Game(config);