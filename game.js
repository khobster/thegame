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
        const bubbleWidth = ctx.canvas.width * 0.7; // Adjusted size for mobile
        const bubbleHeight = bubbleWidth * (this.game.loadedImages.thoughtBubble.height / this.game.loadedImages.thoughtBubble.width);
        const bubbleX = (ctx.canvas.width - bubbleWidth) / 2;
        const bubbleY = ctx.canvas.height * 0.05; // Moved up slightly for better visibility

        // Draw thought bubble
        ctx.drawImage(this.game.loadedImages.thoughtBubble, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

        // Draw Wikipedia image inside bubble
        if (this.faceImage) {
            const imgWidth = bubbleWidth * 0.6;
            const imgHeight = imgWidth * (this.faceImage.height / this.faceImage.width);
            const imgX = bubbleX + (bubbleWidth - imgWidth) / 2;
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
        this.canvas.width = window.innerWidth * 0.9; // Added padding for better mobile experience
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

        const startButton = document.createElement('button');
        startButton.textContent = 'START GAME';
        startButton.style.position = 'absolute';
        startButton.style.left = '50%';
        startButton.style.top = '60%';
        startButton.style.transform = 'translateX(-50%)';
        document.body.appendChild(startButton);

        startButton.addEventListener('click', () => {
            startButton.remove();
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

    async loadNewNPC() {
        const npcX = this.canvas.width / 2 - 30;
        const npcY = this.canvas.height - 150;
        this.currentNPC = new NPC(npcX, npcY, `NPC ${this.questStage + 1}`, this);
        this.remainingGuesses = 7;
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
        if (this.imagesLoaded && this.loadedImages.background) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
        }
    }

    draw() {
        if (!this.imagesLoaded) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        if (this.currentNPC) {
            this.currentNPC.draw(this.ctx);
        }
        if (this.player) {
            this.player.draw(this.ctx);
        }
    }

    update() {
        if (this.player) {
            this.player.move();
        }
        this.checkPlayerNearNPC();
        this.draw();
        requestAnimationFrame(() => this.update());
    }

    checkPlayerNearNPC() {
        if (this.player && this.currentNPC) {
            if (Math.abs(this.player.x - this.currentNPC.x) < 50) {
                this.playerNearNPC = true;
                this.showGuessingUI();
            } else {
                this.playerNearNPC = false;
                this.hideGuessingUI();
            }
        }
    }

    showGuessingUI() {
        this.guessInput.style.display = 'block';
        this.guessButton.style.display = 'block';
        this.hintArea.style.display = 'block';
    }

    hideGuessingUI() {
        this.guessInput.style.display = 'none';
        this.guessButton.style.display = 'none';
        this.hintArea.style.display = 'none';
    }

    async handleGuess(userGuess) {
        if (!this.playerNearNPC) return;

        userGuess = userGuess.toLowerCase().trim();
        const correctAnswer = this.currentNPC.correctAnswer.toLowerCase();

        if (this.isCorrectGuess(userGuess, correctAnswer)) {
            this.handleCorrectGuess();
        } else {
            this.remainingGuesses--;
            if (this.remainingGuesses > 0) {
                const hint = await this.generateHint(userGuess, correctAnswer);
                this.displayHint(hint);
            } else {
                this.gameOver();
            }
        }

        this.guessInput.value = ''; // Clear input after guess
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

    async generateHint(userGuess, correctAnswer) {
        try {
            const response = await fetch('https://us-central1-thegame-91290.cloudfunctions.net/generateHint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guess: userGuess,
                    correctAnswer: correctAnswer
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.hint;
        } catch (error) {
            console.error("Error generating hint:", error);
            return "Sorry, I'm having trouble thinking of a good hint. Try another guess!";
        }
    }

    displayHint(hint) {
        this.hintArea.textContent = `Hint: ${hint}`;
        this.hintArea.style.display = 'block';
    }

    handleCorrectGuess() {
        this.hintArea.textContent = "Correct! You've uncovered a letter.";
        this.addLetterToCollection();
        this.questStage++;

        if (this.questStage < 5) {
            setTimeout(() => {
                this.loadNewNPC();
                this.hintArea.textContent = "Find the next spy!";
            }, 2000);
        } else {
            this.showFinalPuzzle();
        }
    }

    gameOver() {
        this.hideGameElements();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.fillText(`The correct answer was: ${this.currentNPC.correctAnswer}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Play Again';
        restartButton.style.position = 'absolute';
        restartButton.style.left = '50%';
        restartButton.style.top = '70%';
        restartButton.style.transform = 'translateX(-50%)';
        document.body.appendChild(restartButton);

        restartButton.addEventListener('click', () => {
            restartButton.remove();
            this.resetGame();
        });
    }

    getRandomLetter() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    addLetterToCollection() {
        const newLetter = this.getRandomLetter();
        this.lettersCollected.push(newLetter);
        this.scrambleLetters();
    }

    scrambleLetters() {
        this.scrambledLetters = [...this.lettersCollected]
            .sort(() => Math.random() - 0.5)
            .join('');
        this.lettersCollectedDisplay.textContent = `Letters: ${this.scrambledLetters}`;
    }

    async getRandomWord() {
        try {
            const response = await fetch('https://random-word-api.herokuapp.com/word');
            const [word] = await response.json();
            return word.toUpperCase();
        } catch (error) {
            console.error('Error fetching random word:', error);
            return "PUZZLE"; // Fallback word
        }
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

    showFinalPuzzleModal() {
        const puzzleGuess = prompt("Enter your guess for the final word:");
        if (puzzleGuess) {
            this.handleFinalPuzzleGuess(puzzleGuess);
        }
    }

    handleFinalPuzzleGuess(puzzleGuess) {
        if (this.finalPuzzleWord && puzzleGuess.toUpperCase() === this.finalPuzzleWord) {
            this.showWinScreen();
        } else {
            this.hintArea.textContent = "Incorrect puzzle guess. Keep trying!";
        }
    }

    showWinScreen() {
        this.hideGameElements();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
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

    startGame() {
        this.showGameElements();
        this.canvas.style.display = 'block';
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width, this);
        this.questStage = 0;
        this.lettersCollected = [];
        this.scrambledLetters = '';
        this.finalPuzzleWord = null;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.loadNewNPC();
        this.update();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
    // The game will automatically show the title screen once images are loaded
});
