class Character {
    constructor(x, y, width, height, name) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.name = name || "NPC";
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
        this.speed = 5;
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
        super(x, y, 100, 150, 'Mailbox');
        this.game = game;
        this.correctAnswer = null;
        this.hint = null;
        this.wikipediaImage = null;
    }

    draw(ctx) {
        super.draw(ctx, this.game.loadedImages.mailbox);
        if (this.wikipediaImage) {
            this.drawWikipediaImage(ctx);
        }
    }

    drawWikipediaImage(ctx) {
        const imgWidth = this.width;
        const imgHeight = this.wikipediaImage.height * (imgWidth / this.wikipediaImage.width);
        const imgX = this.x + this.width / 2 - imgWidth / 2;
        const imgY = this.y - imgHeight - 10;
        ctx.drawImage(this.wikipediaImage, imgX, imgY, imgWidth, imgHeight);
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
            dice: 'dice.png',
        };

        this.loadedImages = {};
        this.loadImages();

        this.lettersCollected = [];
        this.finalPuzzleWord = null;
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width, this);
        this.mailbox = null;

        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
        this.hintArea = document.getElementById('hintArea');
        this.solveButton = document.getElementById('solveButton');

        this.addEventListeners();
    }

    loadImages() {
        for (let key in this.images) {
            let img = new Image();
            img.src = this.images[key];
            this.loadedImages[key] = img;
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.player) this.player.y = this.canvas.height - 150;
        if (this.mailbox) this.mailbox.y = this.canvas.height - 150;
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

    async loadMailbox() {
        this.mailbox = new Mailbox(this.canvas.width / 2 - 50, this.canvas.height - 150, this);
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.mailbox.correctAnswer = data.title.toLowerCase();
            this.mailbox.hint = data.extract;

            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.mailbox.wikipediaImage = img;
                };
            }
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error);
            this.mailbox.hint = 'Error loading hint.';
        }
    }

    updateUI() {
        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    handleGuess(guess) {
        guess = guess.toLowerCase().trim();
        if (guess === this.mailbox.correctAnswer) {
            this.lettersCollected.push(guess[0].toUpperCase());
            this.updateUI();
            this.loadMailbox();
        } else {
            this.hintArea.textContent = `Hint: ${this.mailbox.hint.substring(0, 50)}...`;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        if (this.loadedImages.background) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw player and mailbox
        if (this.player) this.player.draw(this.ctx);
        if (this.mailbox) this.mailbox.draw(this.ctx);

        requestAnimationFrame(() => this.draw());
    }

    startGame() {
        this.loadMailbox();
        this.draw();
    }
}

// Initialize the game
window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
    game.startGame();
};
