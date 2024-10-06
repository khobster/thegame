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

class NPC extends Character {
    constructor(x, y, name, game) {
        super(x, y, 60, 100, name);
        this.faceImage = null;
        this.correctAnswer = null;
        this.game = game;
    }

    draw(ctx) {
        super.draw(ctx, this.game.loadedImages.npcSprite);
        if (this.faceImage && this.game.loadedImages.thoughtBubble) {
            this.drawThoughtBubble(ctx);
        }
    }

    drawThoughtBubble(ctx) {
    const bubbleWidth = ctx.canvas.width * 0.5;
    const bubbleHeight = bubbleWidth * (this.game.loadedImages.thoughtBubble.height / this.game.loadedImages.thoughtBubble.width);
    const bubbleX = (ctx.canvas.width - bubbleWidth) / 2;
    const bubbleY = this.y - bubbleHeight - 50; // Ensures there's ample space between the NPC and the thought bubble

    ctx.drawImage(this.game.loadedImages.thoughtBubble, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

    if (this.faceImage) {
        // Draw the Wikipedia image within the thought bubble, keeping good spacing
        const imgPadding = 10;
        const imgWidth = bubbleWidth - 2 * imgPadding;
        const imgHeight = imgWidth * (this.faceImage.height / this.faceImage.width);
        const imgX = bubbleX + imgPadding;
        const imgY = bubbleY + (bubbleHeight - imgHeight) / 2;

        ctx.drawImage(this.faceImage, imgX, imgY, imgWidth, imgHeight);
        }
    }
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.images = {
            background: 'background.png',
            playerSprite: 'player_sprite.png',
            npcSprite: 'npc_sprite_0.png',
            thoughtBubble: 'thoughtbubble.png'
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
        this.scrambledLetters = '';
        this.questStage = 0;
        this.finalPuzzleWord = null;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width, this);
        this.currentNPC = null;

        this.playerNearNPC = false;
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
        this.canvas.width = window.innerWidth * 0.9;
        this.canvas.height = window.innerHeight * 0.9;
        if (this.player) {
            this.player.y = this.canvas.height - 150;
        }
        if (this.currentNPC) {
            this.currentNPC.y = this.canvas.height - 150;
        }
        if (this.imagesLoaded) {
            this.draw();
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

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') this.player.direction = -1;
        if (e.key === 'ArrowRight') this.player.direction = 1;
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.player.direction = 0;
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchMove(e) {
        const touchEndX = e.touches[0].clientX;
        const diff = touchEndX - this.touchStartX;
        this.player.direction = diff > 0 ? 1 : (diff < 0 ? -1 : 0);
        this.touchStartX = touchEndX;
    }

    handleTouchEnd() {
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
    this.ctx.fillText('Spy Street', this.canvas.width / 2, this.canvas.height / 2 - 20);

    if (!document.getElementById('startButton')) {
        const startButton = document.createElement('button');
        startButton.id = 'startButton';
        startButton.textContent = 'START GAME';
        startButton.style.position = 'absolute';
        startButton.style.left = '50%';
        startButton.style.top = '60%';
        startButton.style.transform = 'translateX(-50%)';
        document.body.appendChild(startButton);

        startButton.addEventListener('click', () => {
    document.getElementById('startButtonWrapper').remove();
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
        "Use arrow keys or swipe to walk.",
        "Approach the spy to interact.",
        "Guess what he's thinking.",
        "Each correct guess gives you",
        "a letter for the final word puzzle."
    ];
    
    instructions.forEach((line, index) => {
        this.ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 3 + index * 30);
    });

    const continueButton = document.createElement('button');
    continueButton.textContent = 'CONTINUE';
    continueButton.style.position = 'absolute';
    continueButton.style.left = '50%';
    continueButton.style.bottom = '20%';
    continueButton.style.transform = 'translateX(-50%)';
    document.body.appendChild(continueButton);

    continueButton.addEventListener('click', () => {
        continueButton.remove();
        this.startGame();
    });
}
        startGame() {
        this.showGameElements();
        this.gameLoop();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
    this.player.move();

    if (this.currentNPC && this.player.x > this.currentNPC.x - 50 && this.player.x < this.currentNPC.x + 50) {
        this.playerNearNPC = true;

        // Display the hint but truncate if it's too long
        let fullHint = this.currentNPC.hint;
        let maxLength = 80; // Character limit for the hint text to fit well
        this.hintArea.textContent = fullHint.length > maxLength ? fullHint.substring(0, maxLength) + '...' : fullHint;
    } else {
        this.playerNearNPC = false;
        this.hintArea.textContent = "Find the next spy!";
        }
    }

    draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.imagesLoaded) {
        // Draw background
        if (this.loadedImages.background) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw collected letters and dice icon
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = 'yellow';
        this.ctx.fillText(`Letters: ${this.lettersCollected.join(' ')}`, 10, 30);

        if (this.loadedImages.dice) {
            this.ctx.drawImage(this.loadedImages.dice, this.canvas.width - 60, 10, 50, 50);
        }

        // Draw hint area
        if (this.playerNearNPC && this.currentNPC) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(10, 50, this.canvas.width - 20, 60);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '18px Arial';
            this.ctx.fillText(this.currentNPC.hint, this.canvas.width / 2, 90);
        }

        // Draw player and NPCs
        this.player.draw(this.ctx);
        if (this.currentNPC) {
            this.currentNPC.draw(this.ctx);
            }
        }
    }

    handleGuess(guess) {
        if (this.playerNearNPC && this.currentNPC) {
            if (guess.toLowerCase() === this.currentNPC.correctAnswer.toLowerCase()) {
                this.lettersCollected.push(this.currentNPC.correctAnswer[0].toUpperCase());
                this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
                this.nextNPC();
            } else {
                this.remainingGuesses--;
                this.hintArea.textContent = `Wrong! You have ${this.remainingGuesses} guesses left.`;
                if (this.remainingGuesses <= 0) {
                    this.endGame();
                }
            }
        }
    }

    nextNPC() {
        this.currentNPC = new NPC(
            Math.random() * (this.canvas.width - 60),
            this.canvas.height - 150,
            `Spy ${Math.floor(Math.random() * 100)}`,
            this
        );
        this.hintArea.textContent = "Find the next spy!";
    }

    endGame() {
        alert("Game Over! You ran out of guesses.");
        window.location.reload();
    }

    async getRandomWord() {
        const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
        const data = await response.json();
        return data[0];
    }

    showFinalPuzzleModal() {
        let userAnswer = prompt(`Solve the puzzle! Here's your collected letters: ${this.lettersCollected.join(' ')}`);
        if (userAnswer.toLowerCase() === this.finalPuzzleWord.toLowerCase()) {
            alert('Congratulations! You solved the puzzle!');
        } else {
            alert('Wrong answer. Better luck next time!');
        }
    }
}

// Initialize the game
window.onload = () => {
    const game = new Game('gameCanvas');
};
