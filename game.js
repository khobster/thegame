class Mailbox {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 100;
        this.game = game;
        this.faceImage = null;
        this.correctAnswer = null;
        this.hint = null;
    }

    draw(ctx) {
        if (this.game.loadedImages.mailboxSprite) {
            ctx.drawImage(this.game.loadedImages.mailboxSprite, this.x, this.y, this.width, this.height);
            if (this.faceImage) {
                const imgWidth = ctx.canvas.width * 0.4;
                const imgHeight = imgWidth * (this.faceImage.height / this.faceImage.width);
                const imgX = (ctx.canvas.width - imgWidth) / 2;
                const imgY = this.y - imgHeight - 10;
                ctx.drawImage(this.faceImage, imgX, imgY, imgWidth, imgHeight);
            }
        }
    }
}

class DeadDropGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.images = {
            background: 'background.png',
            mailboxSprite: 'mailbox.png'
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

        // Set up initial game state
        this.lettersCollected = [];
        this.scrambledLetters = '';
        this.currentMailbox = null;
        this.player = { x: 0, y: this.canvas.height - 150, width: 60, height: 100 };
        this.playerNearMailbox = false;
        this.remainingGuesses = 7;

        // UI Elements
        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.lettersCollectedDisplay = document.getElementById('lettersCollected');
        this.solveButton = document.getElementById('solveButton');
        this.hintArea = document.getElementById('hintArea');

        this.hideGameElements();
        this.addEventListeners();

        // Wait for all images to load
        Promise.all(this.imageLoadPromises).then(() => {
            this.imagesLoaded = true;
            this.resizeCanvas(); // Call resizeCanvas after images are loaded
            this.showTitleScreen();
        });

        // Handle window resizing
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Ensure player and mailbox positions are updated only if they exist
        if (this.player) {
            this.player.y = this.canvas.height - 150;
        }
        if (this.currentMailbox) {
            this.currentMailbox.y = this.canvas.height - 150;
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
            "Guess the Wikipedia image to collect letters.",
            "Each correct guess gives you a letter",
            "for the final word puzzle."
        ];
        
        instructions.forEach((line, index) => {
            this.ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 3 + index * 30);
        });

        // Ensure the continue button and wrapper exist
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
        await this.nextMailbox();
        this.gameLoop();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.player.direction) {
            const speed = 5; // Adjust player movement speed
            this.player.x += this.player.direction * speed;

            // Prevent player from going off the screen
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > this.canvas.width) this.player.x = this.canvas.width - this.player.width;
        }

        if (this.currentMailbox && Math.abs(this.player.x - this.currentMailbox.x) < 50) {
            this.playerNearMailbox = true;
        } else {
            this.playerNearMailbox = false;
        }

        this.updateUI();
    }

    updateUI() {
        if (this.playerNearMailbox && this.currentMailbox) {
            this.hintArea.style.display = 'block';
            this.hintArea.textContent = this.currentMailbox.hint || "No hint available";
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

            // Draw player and mailbox
            this.ctx.fillStyle = 'blue';
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height); // Draw player

            if (this.currentMailbox) {
                this.currentMailbox.draw(this.ctx);
            }
        }
    }

    async handleGuess(guess) {
        if (this.playerNearMailbox && this.currentMailbox) {
            if (guess.toLowerCase() === this.currentMailbox.correctAnswer.toLowerCase()) {
                this.lettersCollected.push(this.currentMailbox.correctAnswer[0].toUpperCase());
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
        const x = Math.random() * (this.canvas.width - 60);
        const y = this.canvas.height - 150;
        this.currentMailbox = new Mailbox(x, y, this);
        
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            this.currentMailbox.correctAnswer = data.title;
            this.currentMailbox.hint = data.extract;
            
            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.currentMailbox.faceImage = img;
                };
            }
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error);
            this.currentMailbox.correctAnswer = 'error';
            this.currentMailbox.hint = 'Error loading hint';
        }
        
        this.hintArea.textContent = "Guess the next secret in the drop";
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
        this.currentMailbox = null;
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
