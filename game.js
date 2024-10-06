class DeadDropGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.images = {
            background: 'background.png',
            playerSprite: 'player_sprite.png',
            mailbox: 'mailbox.png'
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
        this.currentMailbox = null;

        this.playerNearMailbox = false;
        this.remainingGuesses = 7;

        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
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
        if (this.imagesLoaded) {
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
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.player.direction = 0;
    }

    hideGameElements() {
        this.guessInput.style.display = 'none';
        this.guessButton.style.display = 'none';
        this.lettersCollectedDisplay.style.display = 'none';
        this.hintArea.style.display = 'none';
    }

    showGameElements() {
        this.guessInput.style.display = 'block';
        this.guessButton.style.display = 'block';
        this.lettersCollectedDisplay.style.display = 'block';
        this.hintArea.style.display = 'block';
    }

    async handleGuess(userGuess) {
        if (!this.playerNearMailbox) return;

        userGuess = userGuess.toLowerCase().trim();
        const correctAnswer = this.currentMailbox.correctAnswer.toLowerCase();

        if (this.isCorrectGuess(userGuess, correctAnswer)) {
            this.handleCorrectGuess();
        } else {
            this.remainingGuesses--;
            if (this.remainingGuesses > 0) {
                const hint = await this.generateHint(userGuess, correctAnswer);
                this.displayHint(hint);
            } else {
                this.endGame();
            }
        }

        this.guessInput.value = ''; // Clear input after guess
    }

    isCorrectGuess(guess, correctAnswer) {
        // Exact match or partial match
        return guess === correctAnswer || correctAnswer.includes(guess);
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
        this.remainingGuesses = 7; // Reset guesses for new mailbox
        setTimeout(() => {
            this.loadNewMailbox();
        }, 1500);
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

    addLetterToCollection() {
        const newLetter = this.finalPuzzleWord[this.lettersCollected.length];
        this.lettersCollected.push(newLetter);
        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.imagesLoaded) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
            this.player.draw(this.ctx);
            if (this.currentMailbox) {
                this.currentMailbox.draw(this.ctx);
            }
        }
    }

    startGame() {
        this.showGameElements();
        this.loadNewMailbox();
        this.gameLoop();
    }

    async loadNewMailbox() {
        const x = Math.random() * (this.canvas.width - 60);
        this.currentMailbox = new Mailbox(x, this.canvas.height - 150, this);
        this.remainingGuesses = 7;

        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.currentMailbox.correctAnswer = data.title;
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = data.thumbnail ? data.thumbnail.source : '';
            this.currentMailbox.faceImage = img;
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error);
            this.currentMailbox.correctAnswer = 'error';
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
    }

    checkPlayerNearMailbox() {
        if (this.player && this.currentMailbox) {
            if (Math.abs(this.player.x - this.currentMailbox.x) < 50) {
                this.playerNearMailbox = true;
                this.guessInput.style.display = 'block';
            } else {
                this.playerNearMailbox = false;
                this.guessInput.style.display = 'none';
            }
        }
    }

    endGame() {
        alert("Game Over! You ran out of guesses.");
        this.resetGame();
    }

    resetGame() {
        this.lettersCollected = [];
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.startGame();
    }
}

// Player and Mailbox classes will remain the same as they were in the previous version

window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
};
