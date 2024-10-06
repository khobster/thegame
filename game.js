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
        this.speed = 3; // Reduced speed
        this.canvasWidth = canvasWidth;
        this.direction = 0; // 0: not moving, -1: left, 1: right
        this.game = game;
    }

    move() {
        // Slow down movement on mobile
        const mobileSpeedFactor = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 0.5 : 1;
        this.x += this.speed * this.direction * mobileSpeedFactor;
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
        this.hint = null;
        this.game = game;
    }

    draw(ctx) {
        super.draw(ctx, this.game.loadedImages.npcSprite);
        if (this.faceImage && this.game.loadedImages.thoughtBubble) {
            this.drawThoughtBubble(ctx);
        }
    }

    drawThoughtBubble(ctx) {
        const bubbleWidth = ctx.canvas.width * 0.4;
        const bubbleHeight = bubbleWidth * (this.game.loadedImages.thoughtBubble.height / this.game.loadedImages.thoughtBubble.width);
        const bubbleX = this.x + this.width / 2 - bubbleWidth / 2;
        const bubbleY = this.y - bubbleHeight - 20;

        // Draw thought bubble
        ctx.drawImage(this.game.loadedImages.thoughtBubble, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

        // Draw Wikipedia image inside bubble
        if (this.faceImage) {
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
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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

        const startButton = document.getElementById('startButton');
        const startButtonWrapper = document.getElementById('startButtonWrapper');
        const continueButtonWrapper = document.getElementById('continueButtonWrapper');
        
        if (startButton && startButtonWrapper) {
            startButtonWrapper.style.display = 'block';
            startButton.onclick = () => {
                startButtonWrapper.style.display = 'none';
                if (continueButtonWrapper) continueButtonWrapper.style.display = 'none';
                this.showInstructionScreen();
            };
        }
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

        const continueButtonWrapper = document.getElementById('continueButtonWrapper');
        const continueButton = document.getElementById('continueButton');
        if (continueButtonWrapper && continueButton) {
            continueButtonWrapper.style.display = 'block';
            continueButton.onclick = () => {
                continueButtonWrapper.style.display = 'none';
                this.startGame();
            };
        } else {
            console.error('Continue button or wrapper not found');
        }
    }

    async startGame() {
        this.showGameElements();
        await this.nextNPC();
        this.gameLoop();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.player.move();

        if (this.currentNPC && Math.abs(this.player.x - this.currentNPC.x) < 50) {
            this.playerNearNPC = true;
        } else {
            this.playerNearNPC = false;
        }

        this.updateUI();
    }

    updateUI() {
        if (this.playerNearNPC && this.currentNPC) {
            this.hintArea.style.display = 'block';
            this.hintArea.textContent = this.currentNPC.hint || "No hint available";
        } else {
            this.hintArea.style.display = 'none';
        }

        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.imagesLoaded) {
            // Draw background (maintain aspect ratio)
            const bgAspectRatio = this.loadedImages.background.width / this.loadedImages.background.height;
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

            this.ctx.drawImage(this.loadedImages.background, drawX, drawY, drawWidth, drawHeight);

            // Draw player and NPCs
            this.player.draw(this.ctx);
            if (this.currentNPC) {
                this.currentNPC.draw(this.ctx);
            }
        }
    }

    async handleGuess(guess) {
        if (this.playerNearNPC && this.currentNPC) {
            if (guess.toLowerCase() === this.currentNPC.correctAnswer.toLowerCase()) {
                this.lettersCollected.push(this.currentNPC.correctAnswer[0].toUpperCase());
                this.updateUI();
                await this.nextNPC();
            } else {
                this.remainingGuesses--;
                this.hintArea.textContent = `Wrong! You have ${this.remainingGuesses} guesses left.`;
                if (this.remainingGuesses <= 0) {
                    this.endGame();
                }
            }
        }
        this.guessInput.value = ''; // Clear input after guess
    }

    async nextNPC() {
        const x = Math.random() * (this.canvas.width - 60);
        const y = this.canvas.height - 150;
        this.currentNPC = new NPC(x, y, `Spy ${Math.floor(Math.random() * 100)}`, this);
        
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.currentNPC.correctAnswer = data.title;
            this.currentNPC.hint = data.extract;
            
            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.currentNPC.faceImage = img;
                };
            }
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error);
            this.currentNPC.correctAnswer = 'error';
            this.currentNPC.hint = 'Error loading hint';
        }
        
        this.hintArea.textContent = "Find the next spy!";
        this.remainingGuesses = 7; // Reset guesses for new NPC
    }

    endGame() {
        alert("Game Over! You ran out of guesses.");
        this.resetGame();
    }

    async getRandomWord() {
        try {
            const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
            const data = await response.json();
            return data[0].toUpperCase();
        } catch (error) {
            console.error('Error fetching random word:', error);
            return "PUZZLE"; // Fallback word
        }
    }

    showFinalPuzzleModal() {
        let userAnswer = prompt(`Solve the puzzle! Here are your collected letters: ${this.lettersCollected.join(' ')}\nFinal word: ${this.scrambledLetters}`);
        if (userAnswer && userAnswer.toLowerCase() === this.finalPuzzleWord.toLowerCase()) {
            alert('Congratulations! You solved the puzzle!');
            this.resetGame();
        } else {
            alert('Wrong answer. Keep trying!');
        }
    }

    resetGame() {
        this.lettersCollected = [];
        this.scrambledLetters = '';
        this.questStage = 0;
        this.remainingGuesses = 7;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.player.x = 0;
        this.currentNPC = null;
        this.showTitleScreen();
    }

    scrambleLetters() {
        this.scrambledLetters = [...this.lettersCollected]
            .sort(() => Math.random() - 0.5)
            .join('');
        this.updateUI();
    }
}

// Initialize the game
window.onload = () => {
    const game = new Game('gameCanvas');
};
