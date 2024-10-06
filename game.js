class DeadDropGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.images = {
            background: 'background.png',
            playerSprite: 'player_sprite.png',
            mailbox: 'mailbox.png',
            dice: 'dice.png',
        };

        this.loadedImages = {};
        this.imageLoadPromises = [];

        // Load all images
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

        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
        this.solveButton = document.getElementById('solveButton');
        this.hintArea = document.getElementById('hintArea');

        this.hideGameElements();
        this.addEventListeners();

        this.imagesLoaded = false;

        Promise.all(this.imageLoadPromises).then(() => {
            this.imagesLoaded = true;
            this.resizeCanvas();
            this.showTitleScreen();
            window.addEventListener('resize', () => this.resizeCanvas()); // Move resize event listener here
        });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.imagesLoaded) {
            this.draw(); // Ensure canvas is redrawn after resize
        }
    }

    addEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
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
        await this.nextMailbox();
        this.gameLoop();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Add logic to update game elements
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.imagesLoaded) {
            // Draw background (maintain aspect ratio)
            const bgImage = this.loadedImages.background;
            const bgAspectRatio = bgImage.width / bgImage.height;
            const canvasAspectRatio = this.canvas.width / this.canvas.height;

            let drawWidth, drawHeight, drawX, drawY;

            if (canvasAspectRatio > bgAspectRatio) {
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / bgAspectRatio;
                drawX = 0;
                drawY = (this.canvas.height - drawHeight) / 2;
            } else {
                drawHeight = this.canvas.height;
                drawWidth = drawHeight * bgAspectRatio;
                drawX = (this.canvas.width - drawWidth) / 2;
                drawY = 0;
            }

            this.ctx.drawImage(bgImage, drawX, drawY, drawWidth, drawHeight);

            // Add logic to draw player, mailbox, and other elements
        }
    }

    handleGuess(guess) {
        // Add guessing logic
    }

    async nextMailbox() {
        // Add logic for next mailbox with Wikipedia image
    }

    showFinalPuzzleModal() {
        // Logic to display the final puzzle
    }
}

// Initialize the game
window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
};
