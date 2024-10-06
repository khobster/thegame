class Character {
    constructor(x, y, width, height, name) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.name = name || "Object";
    }

    draw(ctx, sprite) {
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        }
    }
}

class Player extends Character {
    constructor(x, y, canvasWidth, game) {
        super(x, y, 60, 100, 'Player');
        this.speed = 3;
        this.canvasWidth = canvasWidth;
        this.direction = 0; // 0: not moving, -1: left, 1: right
        this.game = game;
    }

    move() {
        this.x += this.speed * this.direction;
        if (this.x < 0) this.x = 0;
        if (this.x > this.canvasWidth - this.width) this.x = this.canvasWidth - this.width;
    }

    draw(ctx) {
        if (this.game.loadedImages.playerSprite) {
            ctx.drawImage(this.game.loadedImages.playerSprite, this.x, this.y, this.width, this.height);
        }
    }
}

class Mailbox extends Character {
    constructor(x, y, game) {
        super(x, y, 60, 100, "Mailbox");
        this.game = game;
    }

    draw(ctx) {
        const mailboxImage = this.game.loadedImages.mailbox;
        if (mailboxImage) {
            ctx.drawImage(mailboxImage, this.x, this.y, this.width, this.height);
        }
    }
}

class DeadDropGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.images = {
            background: 'background.png',
            playerSprite: 'player_sprite.png',
            mailbox: 'mailbox.png',
            dice: 'dice.png'
        };

        this.loadedImages = {};
        this.imageLoadPromises = [];
        for (let [key, src] of Object.entries(this.images)) {
            const img = new Image();
            img.src = src;
            this.loadedImages[key] = img;
            this.imageLoadPromises.push(new Promise((resolve) => {
                img.onload = resolve;
            }));
        }

        this.lettersCollected = [];
        this.remainingGuesses = 7;
        this.currentCorrectAnswer = "";
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width, this);
        this.mailbox = new Mailbox(this.canvas.width / 2 - 30, this.canvas.height - 150, this);

        this.playerNearMailbox = false;

        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
        this.solveButton = document.getElementById('solveButton');
        this.hintArea = document.getElementById('hintArea');

        this.hideGameElements();
        this.addEventListeners();

        Promise.all(this.imageLoadPromises).then(() => {
            this.showTitleScreen();
        });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.player) {
            this.player.y = this.canvas.height - 150;
        }
        if (this.mailbox) {
            this.mailbox.x = this.canvas.width / 2 - 30;
            this.mailbox.y = this.canvas.height - 150;
        }
        if (this.loadedImages.background) {
            this.draw();
        }
    }

    addEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.guessButton.addEventListener('click', () => this.handleGuess(this.guessInput.value));
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') this.player.direction = -1;
        if (e.key === 'ArrowRight') this.player.direction = 1;
    }

    handleKeyUp(e) {
        this.player.direction = 0;
    }

    hideGameElements() {
        this.guessInput.style.display = 'none';
        this.guessButton.style.display = 'none';
        this.solveButton.style.display = 'none';
        this.lettersCollectedDisplay.style.display = 'none';
        this.hintArea.style.display = 'none';
    }

    showGameElements() {
        this.guessInput.style.display = 'block';
        this.guessButton.style.display = 'block';
        this.solveButton.style.display = 'block';
        this.lettersCollectedDisplay.style.display = 'block';
        this.hintArea.style.display = 'block';
    }

    showTitleScreen() {
        this.hideGameElements();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Dead Drop', this.canvas.width / 2, this.canvas.height / 2 - 20);

        const startButton = document.getElementById('startButton');
        const startButtonWrapper = document.getElementById('startButtonWrapper');
        if (startButton && startButtonWrapper) {
            startButtonWrapper.style.display = 'block';
            startButton.onclick = () => {
                startButtonWrapper.style.display = 'none';
                this.startGame();
            };
        }
    }

    async startGame() {
        this.showGameElements();
        await this.loadNextWikipediaData();
        this.gameLoop();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.player.move();

        if (Math.abs(this.player.x - this.mailbox.x) < 50) {
            this.playerNearMailbox = true;
        } else {
            this.playerNearMailbox = false;
        }

        this.updateUI();
    }

    updateUI() {
        if (this.playerNearMailbox) {
            this.hintArea.style.display = 'block';
            this.hintArea.textContent = this.currentHint || "Guess what's in the mailbox!";
        } else {
            this.hintArea.style.display = 'none';
        }

        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.loadedImages.background) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
        }

        this.player.draw(this.ctx);
        this.mailbox.draw(this.ctx);

        if (this.playerNearMailbox && this.currentImage) {
            this.drawWikipediaImage(this.ctx);
        }
    }

    async handleGuess(guess) {
        if (this.playerNearMailbox && guess.toLowerCase() === this.currentCorrectAnswer.toLowerCase()) {
            this.lettersCollected.push(this.currentCorrectAnswer[0].toUpperCase());
            await this.loadNextWikipediaData();
        } else {
            this.remainingGuesses--;
            if (this.remainingGuesses <= 0) {
                this.endGame();
            }
        }
        this.guessInput.value = ""; // Clear input after each guess
    }

    async loadNextWikipediaData() {
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.currentCorrectAnswer = data.title;
            this.currentHint = data.extract;

            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.currentImage = img;
                };
            }
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error);
            this.currentCorrectAnswer = "Error";
            this.currentHint = "Error loading hint.";
        }
    }

    drawWikipediaImage(ctx) {
        const imgWidth = ctx.canvas.width * 0.6;
        const imgHeight = imgWidth * (this.currentImage.height / this.currentImage.width);
        const imgX = (ctx.canvas.width - imgWidth) / 2;
        const imgY = this.mailbox.y - imgHeight - 20;

        ctx.drawImage(this.currentImage, imgX, imgY, imgWidth, imgHeight);
    }

    endGame() {
        alert("Game Over! You ran out of guesses.");
        this.resetGame();
    }

    resetGame() {
        this.lettersCollected = [];
        this.remainingGuesses = 7;
        this.showTitleScreen();
    }
}

window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
};
