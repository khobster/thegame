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
    constructor(x, y, canvasWidth) {
        super(x, y, 60, 100, 'Player');
        this.speed = 5;
        this.canvasWidth = canvasWidth;
        this.direction = 0; // 0: not moving, -1: left, 1: right
    }

    move() {
        this.x += this.speed * this.direction;
        if (this.direction !== 0) {
            this.frame = (this.frame + 1) % 2;
        }
        if (this.x < 0) this.x = 0;
        if (this.x > this.canvasWidth - this.width) this.x = this.canvasWidth - this.width;
    }
}

class NPC extends Character {
    constructor(x, y, name) {
        super(x, y, 60, 100, name);
        this.faceImage = null;
        this.correctAnswer = null;
        this.thoughtBubble = new Image();
        this.thoughtBubble.src = 'thoughtbubble.png';
    }

    draw(ctx, sprite) {
        super.draw(ctx, sprite);
        if (this.faceImage && this.thoughtBubble.complete) {
            this.drawThoughtBubble(ctx);
        }
    }

    drawThoughtBubble(ctx) {
        const bubbleWidth = this.thoughtBubble.width * 0.5;
        const bubbleHeight = this.thoughtBubble.height * 0.5;
        const bubbleX = this.x + this.width / 2 - bubbleWidth / 2 - 50; // Shift slightly to the left
        const bubbleY = this.y - bubbleHeight - 20;

        // Draw thought bubble
        ctx.drawImage(this.thoughtBubble, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

        // Draw image inside bubble
        if (this.faceImage) {
            const aspectRatio = this.faceImage.width / this.faceImage.height;
            let imgWidth = bubbleWidth * 0.7;
            let imgHeight = imgWidth / aspectRatio;

            if (imgHeight > bubbleHeight * 0.7) {
                imgHeight = bubbleHeight * 0.7;
                imgWidth = imgHeight * aspectRatio;
            }

            const imgX = bubbleX + bubbleWidth / 2 - imgWidth / 2;
            const imgY = bubbleY + bubbleHeight / 2 - imgHeight / 2;

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

        this.background = new Image();
        this.background.src = 'background.png';

        this.playerSprite = new Image();
        this.playerSprite.src = 'player_sprite.png';

        this.npcSprite = new Image();
        this.npcSprite.src = 'npc_sprite_0.png';

        this.lettersCollected = [];
        this.scrambledLetters = '';
        this.questStage = 0;
        this.finalPuzzleWord = null;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width);
        this.currentNPC = null;

        this.playerNearNPC = false;

        this.hintArea = document.getElementById('hintArea');
        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
        this.solveButton = document.getElementById('solveButton');

        this.guessButton.addEventListener('click', () => this.handleGuess(this.guessInput.value));

        this.modalOverlay = document.createElement('div');
        this.modalOverlay.id = 'modalOverlay';
        this.modalOverlay.style.display = 'none';
        document.body.appendChild(this.modalOverlay);

        this.modal = document.createElement('div');
        this.modal.id = 'modal';
        this.modalOverlay.appendChild(this.modal);

        this.modalInput = document.createElement('input');
        this.modalInput.type = 'text';
        this.modal.appendChild(this.modalInput);

        this.modalSubmit = document.createElement('button');
        this.modalSubmit.textContent = 'Submit';
        this.modal.appendChild(this.modalSubmit);

        this.modalSubmit.addEventListener('click', () => {
            this.handleFinalPuzzleGuess(this.modalInput.value);
            this.modalOverlay.style.display = 'none';
        });

        this.solveButton.addEventListener('click', () => {
            this.modalOverlay.style.display = 'flex';
            this.modalInput.value = '';
            this.modalInput.focus();
        });

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        this.addTouchControls();
        
        // Hide elements initially
        this.hideGameElements();
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
    }

    addTouchControls() {
        let touchStartX = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        this.canvas.addEventListener('touchmove', (e) => {
            const touchEndX = e.touches[0].clientX;
            const diff = touchEndX - touchStartX;
            if (diff > 0) {
                this.player.direction = 0.5; // Reduced speed
            } else if (diff < 0) {
                this.player.direction = -0.5; // Reduced speed
            }
            touchStartX = touchEndX;
        });
        this.canvas.addEventListener('touchend', () => {
            this.player.direction = 0;
        });
    }

    showTitleScreen() {
        this.hideGameElements();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px "Archivo Narrow"';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('SPY GAME', this.canvas.width / 2 - 80, this.canvas.height / 2 - 20);

        const startButton = document.createElement('button');
        startButton.textContent = 'START GAME';
        startButton.style.position = 'absolute';
        startButton.style.left = '50%';
        startButton.style.top = '60%';
        startButton.style.transform = 'translateX(-50%)';
        startButton.style.fontSize = '20px';
        startButton.style.padding = '10px';
        document.body.appendChild(startButton);

        startButton.addEventListener('click', () => {
            startButton.remove();
            this.showInstructionScreen();
        });
    }

    showInstructionScreen() {
        this.hideGameElements();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const instructions = [
            "Use arrow keys or swipe to move.",
            "Approach NPCs to interact.",
            "Guess what the spy is thinking.",
            "Each correct guess gives you",
            "a letter for the final puzzle."
        ];
        
        this.ctx.font = '18px "Archivo Narrow"';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        
        instructions.forEach((line, index) => {
            this.ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 3 + index * 30);
        });

        const continueButton = document.createElement('button');
        continueButton.textContent = 'CONTINUE';
        continueButton.style.position = 'absolute';
        continueButton.style.left = '50%';
        continueButton.style.bottom = '20%';
        continueButton.style.transform = 'translateX(-50%)';
        continueButton.style.fontSize = '20px';
        continueButton.style.padding = '10px 20px';
        document.body.appendChild(continueButton);

        continueButton.addEventListener('click', () => {
            continueButton.remove();
            this.startGame();
        });
    }

    async loadNewNPC() {
        this.currentNPC = new NPC(300, this.canvas.height - 150, `NPC ${this.questStage + 1}`);
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.currentNPC.faceImage = img;
                };
            }
            this.currentNPC.correctAnswer = data.title.toLowerCase();
            console.log(`Loaded NPC image for ${this.currentNPC.name}. Answer: ${this.currentNPC.correctAnswer}`);
        } catch (error) {
            console.error('Error fetching Wikipedia image:', error);
        }
    }

    drawBackground() {
        this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
    }

    startGame() {
        this.showGameElements();
        this.loadNewNPC();
        this.gameLoop();
    }

    hideGameElements() {
        this.hintArea.style.display = 'none';
        this.guessInput.style.display = 'none';
        this.guessButton.style.display = 'none';
        this.lettersCollectedDisplay.style.display = 'none';
        this.solveButton.style.display = 'none';
    }

    showGameElements() {
        this.hintArea.style.display = 'block';
        this.guessInput.style.display = 'block';
        this.guessButton.style.display = 'block';
        this.lettersCollectedDisplay.style.display = 'block';
        this.solveButton.style.display = 'block';
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.player.move();
        this.player.draw(this.ctx, this.playerSprite);
        if (this.currentNPC) {
            this.currentNPC.draw(this.ctx, this.npcSprite);
        }
        this.checkPlayerNearNPC();
        requestAnimationFrame(() => this.gameLoop());
    }

    checkPlayerNearNPC() {
        if (this.currentNPC) {
            const distance = Math.abs(this.player.x - this.currentNPC.x);
            this.playerNearNPC = distance < 100;
            this.hintArea.style.display = this.playerNearNPC ? 'block' : 'none';
            if (this.playerNearNPC) {
                this.hintArea.textContent = "Press 'Enter' or tap 'Guess' to interact";
            }
        }
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') {
            this.player.direction = -1;
        } else if (e.key === 'ArrowRight') {
            this.player.direction = 1;
        } else if (e.key === 'Enter' && this.playerNearNPC) {
            this.handleGuess(this.guessInput.value);
        }
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            this.player.direction = 0;
        }
    }

    async getRandomWord() {
        try {
            const response = await fetch('https://random-word-api.herokuapp.com/word');
            const [word] = await response.json();
            return word;
        } catch (error) {
            console.error('Error fetching random word:', error);
            return 'fallback';
        }
    }

    handleGuess(guess) {
        if (!this.playerNearNPC) return;

        guess = guess.toLowerCase().trim();
        const correctAnswer = this.currentNPC.correctAnswer.toLowerCase();

        if (this.isCorrectGuess(guess, correctAnswer)) {
            this.handleCorrectGuess();
        } else {
            this.hintArea.textContent = "Not quite. Try again!";
        }

        this.guessInput.value = '';
    }

    isCorrectGuess(guess, correctAnswer) {
        // Exact match
        if (guess === correctAnswer) return true;

        // Partial match
        const guessWords = guess.split(' ');
        const answerWords = correctAnswer.split(' ');

        for (let guessWord of guessWords) {
            for (let answerWord of answerWords) {
                if (answerWord.includes(guessWord) || guessWord.includes(answerWord)) {
                    return true;
                }
            }
        }

        // Levenshtein distance for similar words
        for (let guessWord of guessWords) {
            for (let answerWord of answerWords) {
                if (this.levenshteinDistance(guessWord, answerWord) <= 2) {
                    return true;
                }
            }
        }

        return false;
    }

    levenshteinDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    handleCorrectGuess() {
        this.hintArea.textContent = "Correct! You've uncovered a letter.";
        const newLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        this.lettersCollected.push(newLetter);
        this.updateLettersCollectedDisplay();
        this.questStage++;

        if (this.questStage < 5) {
            setTimeout(() => {
                this.loadNewNPC();
                this.hintArea.textContent = "Find the next NPC!";
            }, 2000);
        } else {
            this.showFinalPuzzle();
        }
    }

    updateLettersCollectedDisplay() {
        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    showFinalPuzzle() {
        this.hintArea.textContent = "Unscramble the letters to find the spy's codename!";
        this.scrambledLetters = this.shuffleArray([...this.lettersCollected]).join('');
        this.solveButton.style.display = 'block';
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    handleFinalPuzzleGuess(guess) {
        if (guess.toLowerCase() === this.finalPuzzleWord.toLowerCase()) {
            this.showWinScreen();
        } else {
            this.hintArea.textContent = "Not quite. Try again!";
        }
    }

    showWinScreen() {
        this.hideGameElements();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px "Archivo Narrow"';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Congratulations!', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.fillText(`You've uncovered the spy's codename: ${this.finalPuzzleWord}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Play Again';
        restartButton.style.position = 'absolute';
        restartButton.style.left = '50%';
        restartButton.style.top = '70%';
        restartButton.style.transform = 'translateX(-50%)';
        restartButton.style.fontSize = '20px';
        restartButton.style.padding = '10px 20px';
        document.body.appendChild(restartButton);

        restartButton.addEventListener('click', () => {
            restartButton.remove();
            this.resetGame();
        });
    }

    resetGame() {
        this.lettersCollected = [];
        this.scrambledLetters = '';
        this.questStage = 0;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.player.x = 0;
        this.currentNPC = null;
        this.showTitleScreen();
    }
}

const game = new Game('gameCanvas');
game.showTitleScreen();
