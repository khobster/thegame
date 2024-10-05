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
        this.speed = 2;
        this.canvasWidth = canvasWidth;
        this.isMoving = false;
    }

    move() {
        if (this.isMoving) {
            this.x += this.speed;
            this.frame = (this.frame + 1) % 2;
            if (this.x > this.canvasWidth) {
                this.x = -this.width;
            }
        }
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
        const bubbleWidth = 300;  // Increased size
        const bubbleHeight = 300; // Increased size
        const bubbleX = this.x + this.width / 2 - bubbleWidth / 2;
        const bubbleY = this.y - bubbleHeight - 20;

        // Draw thought bubble
        ctx.drawImage(this.thoughtBubble, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

        // Draw Wikipedia image inside bubble
        if (this.faceImage) {
            const imgWidth = bubbleWidth * 0.8;
            const imgHeight = bubbleHeight * 0.8;
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
        this.canvas.width = 800;
        this.canvas.height = 400;

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
        this.player = new Player(0, 250, this.canvas.width);
        this.currentNPC = null;

        this.playerNearNPC = false;
        this.remainingGuesses = 7;

        this.hintArea = document.getElementById('hintArea');
        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
        this.solveButton = document.getElementById('solveButton');

        this.guessButton.addEventListener('click', () => this.handleGuess(this.guessInput.value));

        this.solveButton.addEventListener('click', () => {
            const puzzleGuess = prompt("Enter your guess for the final word:");
            this.handleFinalPuzzleGuess(puzzleGuess);
        });

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        this.addTouchControls();
    }

    showTitleScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Spy Street', this.canvas.width / 2 - 80, this.canvas.height / 2 - 20);

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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Instructions:', this.canvas.width / 2 - 50, 100);
        this.ctx.fillText('Use arrow keys or swipe to walk.', 50, 150);
        this.ctx.fillText('Approach the spy to interact.', 50, 180);
        this.ctx.fillText("Guess what he's thinking.", 50, 210);
        this.ctx.fillText('Each correct guess gives you a letter for the final word puzzle.', 50, 240);

        const continueButton = document.createElement('button');
        continueButton.textContent = 'CONTINUE';
        continueButton.style.position = 'absolute';
        continueButton.style.left = '50%';
        continueButton.style.top = '70%';
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
        this.currentNPC = new NPC(npcX, npcY, `NPC ${this.questStage + 1}`);
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
        this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();

        if (this.player) {
            this.player.move();
            this.player.draw(this.ctx, this.playerSprite);
        }

        if (this.currentNPC) {
            this.currentNPC.draw(this.ctx, this.npcSprite);
        }

        if (this.player && this.currentNPC) {
            if (Math.abs(this.player.x - this.currentNPC.x) < 50) {
                this.playerNearNPC = true;
                this.showGuessingUI();
            } else {
                this.playerNearNPC = false;
                this.hideGuessingUI();
            }
        }

        this.displayCollectedLetters();
        this.displayRemainingGuesses();
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

    displayCollectedLetters() {
        this.lettersCollectedDisplay.textContent = `Letters: ${this.scrambledLetters}`;
    }

    displayRemainingGuesses() {
        this.hintArea.textContent = `Remaining guesses: ${this.remainingGuesses}`;
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
        this.hideGuessingUI();
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

    async handleFinalPuzzleGuess(puzzleGuess) {
        if (this.finalPuzzleWord && puzzleGuess.toUpperCase() === this.finalPuzzleWord) {
            this.showWinScreen();
        } else {
            this.hintArea.textContent = "Incorrect puzzle guess. Keep trying!";
        }
    }

    showWinScreen() {
        this.hideGuessingUI();
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
        this.canvas.style.display = 'block';
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width);
        this.questStage = 0;
        this.lettersCollected = [];
        this.scrambledLetters = '';
        this.finalPuzzleWord = null;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.loadNewNPC();
        this.start();
    }

    start() {
        const gameLoop = () => {
            this.update();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') this.player.direction = -1;
        if (e.key === 'ArrowRight') this.player.direction = 1;
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.player.direction = 0;
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
                this.player.direction = 1;
            } else if (diff < 0) {
                this.player.direction = -1;
            }
            touchStartX = touchEndX;
        });
        this.canvas.addEventListener('touchend', () => {
            this.player.direction = 0;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
    game.showTitleScreen();
});
