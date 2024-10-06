class DeadDropGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.images = {
            background: 'background.png',
            playerSprite: 'player_sprite.png',
            mailboxSprite: 'mailbox.png',
            dice: 'dice.png',
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
        this.remainingGuesses = 5;
        this.finalPuzzleWord = null;
        this.player = new Player(50, this.canvas.height - 150, this.canvas.width, this);
        this.currentImageData = null;

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
        this.player.y = this.canvas.height - 150;
        this.draw();
    }

    addEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.guessButton.addEventListener('click', () => this.handleGuess(this.guessInput.value));
        this.solveButton.addEventListener('click', () => this.showFinalPuzzleModal());
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

        const startButton = document.createElement('button');
        startButton.textContent = 'START GAME';
        startButton.style.position = 'absolute';
        startButton.style.left = '50%';
        startButton.style.top = '60%';
        startButton.style.transform = 'translateX(-50%)';
        document.body.appendChild(startButton);

        startButton.addEventListener('click', () => {
            startButton.remove();
            this.startGame();
        });
    }

    async startGame() {
        this.showGameElements();
        await this.loadNextImage();
        this.gameLoop();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.player.move();
        if (this.isPlayerNearMailbox()) {
            this.showGuessingUI();
        } else {
            this.hideGuessingUI();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        if (this.loadedImages.background) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw player
        this.player.draw(this.ctx);

        // Draw mailbox
        if (this.loadedImages.mailboxSprite) {
            this.ctx.drawImage(this.loadedImages.mailboxSprite, this.canvas.width / 2 - 30, this.canvas.height - 150, 60, 100);
        }

        // Draw Wikipedia image
        if (this.currentImageData && this.currentImageData.image) {
            const img = this.currentImageData.image;
            const imgWidth = this.canvas.width * 0.4;
            const imgHeight = imgWidth * (img.height / img.width);
            this.ctx.drawImage(img, (this.canvas.width - imgWidth) / 2, 50, imgWidth, imgHeight);
        }
    }

    isPlayerNearMailbox() {
        return Math.abs(this.player.x - this.canvas.width / 2) < 50;
    }

    showGuessingUI() {
        this.guessInput.style.display = 'block';
        this.guessButton.style.display = 'block';
    }

    hideGuessingUI() {
        this.guessInput.style.display = 'none';
        this.guessButton.style.display = 'none';
    }

    async loadNextImage() {
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.currentImageData = {
                title: data.title.toLowerCase(),
                extract: data.extract,
                image: null
            };

            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.src = data.thumbnail.source;
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    this.currentImageData.image = img;
                };
            }
        } catch (error) {
            console.error('Error loading Wikipedia data:', error);
        }
    }

    async handleGuess(guess) {
        if (!this.currentImageData) return;

        guess = guess.toLowerCase().trim();
        const correctAnswer = this.currentImageData.title.toLowerCase();

        if (guess === correctAnswer) {
            this.hintArea.textContent = 'Correct! You gained a letter.';
            this.addLetter();
            await this.loadNextImage();
        } else {
            this.remainingGuesses--;
            this.hintArea.textContent = `Hint: ${this.currentImageData.extract.substring(0, 50)}... (${this.remainingGuesses} guesses left)`;
            if (this.remainingGuesses <= 0) {
                this.endGame();
            }
        }
    }

    addLetter() {
        const randomLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        this.lettersCollected.push(randomLetter);
        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    endGame() {
        this.hintArea.textContent = 'Game Over! You ran out of guesses.';
    }
}

class Player {
    constructor(x, y, canvasWidth, game) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 100;
        this.speed = 3;
        this.canvasWidth = canvasWidth;
        this.game = game;
        this.direction = 0;
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

window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
};
