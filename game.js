class Character {
    constructor(x, y, width, height, name) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.name = name || "NPC";
        this.frame = 0;
    }

    draw(ctx, sprite) {
        if (sprite) {
            ctx.drawImage(sprite, this.frame * this.width, 0, this.width, this.height, this.x, this.y, this.width, this.height);
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
        if (this.direction !== 0) {
            this.frame = (this.frame + 1) % 2;
        }
        if (this.x < 0) this.x = 0;
        if (this.x > this.canvasWidth - this.width) this.x = this.canvasWidth - this.width;
    }

    draw(ctx) {
        if (this.game.loadedImages.playerSprite) {
            ctx.drawImage(this.game.loadedImages.playerSprite, this.frame * this.width, 0, this.width, this.height, this.x, this.y, this.width, this.height);
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
        this.finalPuzzleWord = null;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width, this);
        this.mailbox = { x: this.canvas.width / 2 - 30, y: this.canvas.height - 150, width: 60, height: 100 };
        this.playerNearMailbox = false;

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
            this.mailbox.y = this.canvas.height - 150;
        }
        if (this.imagesLoaded) {
            this.draw();
        }
    }

    addEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.guessButton.addEventListener('click', () => this.handleGuess(this.guessInput.value));
        this.solveButton.addEventListener('click', () => this.showFinalPuzzleModal());
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') this.player.direction = -1;
        if (e.key === 'ArrowRight') this.player.direction = 1;
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.player.direction = 0;
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

        const startButton = document.getElementById('startButtonWrapper');
        startButton.style.display = 'block';

        document.getElementById('startButton').addEventListener('click', () => {
            startButton.style.display = 'none';
            this.showInstructionScreen();
        });
    }

    showInstructionScreen() {
        this.hideGameElements();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';

        const instructions = [
            "Use arrow keys to walk.",
            "Approach the mailbox to interact.",
            "Guess what image is being beamed up.",
            "Each correct guess gives you",
            "a letter for the final word puzzle."
        ];

        instructions.forEach((line, index) => {
            this.ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 3 + index * 30);
        });

        const continueButton = document.getElementById('continueButtonWrapper');
        continueButton.style.display = 'block';

        document.getElementById('continueButton').addEventListener('click', () => {
            continueButton.style.display = 'none';
            this.startGame();
        });
    }

    async startGame() {
        this.showGameElements();
        this.loadNewMailbox();
        this.gameLoop();
    }

    async loadNewMailbox() {
        this.mailbox.x = this.canvas.width / 2 - this.mailbox.width / 2;
        this.remainingGuesses = 7;
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.correctAnswer = data.title.toLowerCase();
            console.log(`Loaded image. Answer: ${this.correctAnswer}`);

            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.mailboxImage = img;
                };
            }
        } catch (error) {
            console.error('Error fetching Wikipedia image:', error);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.player.move();
        this.checkPlayerNearMailbox();
        this.updateUI();
    }

    checkPlayerNearMailbox() {
        if (Math.abs(this.player.x - this.mailbox.x) < 50) {
            this.playerNearMailbox = true;
        } else {
            this.playerNearMailbox = false;
        }
    }

    updateUI() {
        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.imagesLoaded) {
            // Draw background
            if (this.loadedImages.background) {
                this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
            }

            // Draw player and mailbox
            this.player.draw(this.ctx);
            this.ctx.drawImage(this.loadedImages.mailbox, this.mailbox.x, this.mailbox.y, this.mailbox.width, this.mailbox.height);

            // Draw Wikipedia image being beamed up from the mailbox
            if (this.mailboxImage) {
                const imgX = this.mailbox.x - this.mailboxImage.width / 2 + this.mailbox.width / 2;
                const imgY = this.mailbox.y - this.mailboxImage.height - 10;
                this.ctx.drawImage(this.mailboxImage, imgX, imgY, 100, 100);
            }
        }
    }

    async handleGuess(guess) {
        if (this.playerNearMailbox) {
            if (guess.toLowerCase().trim() === this.correctAnswer) {
                this.lettersCollected.push(this.correctAnswer[0].toUpperCase());
                this.loadNewMailbox();
            } else {
                this.remainingGuesses--;
                this.hintArea.textContent = `Wrong! You have ${this.remainingGuesses} guesses left.`;
                if (this.remainingGuesses <= 0) {
                    this.endGame();
                }
            }
        }
    }

    endGame() {
        alert('Game Over! You ran out of guesses.');
        window.location.reload();
    }

    async getRandomWord() {
        const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
        const data = await response.json();
        return data[0];
    }

    showFinalPuzzleModal() {
        const userAnswer = prompt(`Solve the puzzle! Here are your letters: ${this.lettersCollected.join(' ')}`);
        if (userAnswer.toLowerCase() === this.finalPuzzleWord.toLowerCase()) {
            alert('Congratulations! You solved the puzzle!');
        } else {
            alert('Wrong answer. Try again!');
        }
    }
}

window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
};
