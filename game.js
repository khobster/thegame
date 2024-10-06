class DeadDropGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.images = {
            background: 'background.png',
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
        this.scrambledLetters = '';
        this.finalPuzzleWord = null;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.remainingGuesses = 7;

        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
        this.solveButton = document.getElementById('solveButton');
        this.hintArea = document.getElementById('hintArea');

        this.hideGameElements();

        // Binding the event listeners to the correct `this` context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);

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
        if (this.imagesLoaded) {
            this.draw();
        }
    }

    addEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
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
            "Approach the mailbox to interact.",
            "Guess what the Wikipedia image is.",
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
        if (this.player) {
            this.player.move();
        }

        if (this.mailbox && Math.abs(this.player.x - this.mailbox.x) < 50) {
            this.playerNearMailbox = true;
        } else {
            this.playerNearMailbox = false;
        }

        this.updateUI();
    }

    updateUI() {
        if (this.playerNearMailbox && this.mailbox) {
            this.hintArea.style.display = 'block';
            this.hintArea.textContent = this.mailbox.hint || "No hint available";
        } else {
            this.hintArea.style.display = 'none';
        }

        this.lettersCollectedDisplay.textContent = `Letters: ${this.lettersCollected.join(' ')}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.imagesLoaded) {
            // Draw background
            const bgImage = this.loadedImages.background;
            this.ctx.drawImage(bgImage, 0, 0, this.canvas.width, this.canvas.height);

            // Draw mailbox
            if (this.mailbox) {
                const mailboxImage = this.loadedImages.mailbox;
                this.ctx.drawImage(mailboxImage, this.mailbox.x, this.mailbox.y, this.mailbox.width, this.mailbox.height);
            }

            // Draw Wikipedia image above mailbox
            if (this.mailbox && this.mailbox.faceImage) {
                const imgWidth = this.canvas.width * 0.5;
                const imgHeight = imgWidth * (this.mailbox.faceImage.height / this.mailbox.faceImage.width);
                const imgX = (this.canvas.width - imgWidth) / 2;
                const imgY = this.mailbox.y - imgHeight - 10;

                this.ctx.drawImage(this.mailbox.faceImage, imgX, imgY, imgWidth, imgHeight);
            }

            // Draw player
            this.player.draw(this.ctx);
        }
    }

    async handleGuess(guess) {
        if (this.playerNearMailbox && this.mailbox) {
            if (guess.toLowerCase() === this.mailbox.correctAnswer.toLowerCase()) {
                this.lettersCollected.push(this.mailbox.correctAnswer[0].toUpperCase());
                this.updateUI();
                await this.nextMailbox();
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

    async nextMailbox() {
        this.mailbox = {
            x: this.canvas.width / 2 - 30,
            y: this.canvas.height - 150,
            width: 60,
            height: 100
        };

        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.mailbox.correctAnswer = data.title;
            this.mailbox.hint = data.extract;

            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.mailbox.faceImage = img;
                };
            }
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error);
            this.mailbox.correctAnswer = 'error';
            this.mailbox.hint = 'Error loading hint';
        }

        this.hintArea.textContent = "Approach the mailbox to see the next clue!";
        this.remainingGuesses = 7; // Reset guesses for new mailbox
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
        this.remainingGuesses = 7;
        this.getRandomWord().then(word => this.finalPuzzleWord = word);
        this.player.x = 0;
        this.mailbox = null;
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
    const game = new DeadDropGame('gameCanvas');
};
