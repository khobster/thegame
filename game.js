class Player {
    constructor(x, y, canvasWidth, game) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 100;
        this.speed = 5;
        this.direction = 0; // 0: not moving, -1: left, 1: right
        this.canvasWidth = canvasWidth;
        this.game = game;
        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 5;
    }

    move() {
        this.x += this.speed * this.direction;
        if (this.x < 0) this.x = 0;
        if (this.x > this.canvasWidth - this.width) this.x = this.canvasWidth - this.width;

        if (this.direction !== 0) {
            this.tickCount++;
            if (this.tickCount > this.ticksPerFrame) {
                this.tickCount = 0;
                this.frameIndex = (this.frameIndex + 1) % 2;
            }
        } else {
            this.frameIndex = 0;
        }
    }

    draw(ctx) {
        if (this.game.loadedImages.playerSprite) {
            const frameWidth = this.game.loadedImages.playerSprite.width / 2;
            ctx.save();
            if (this.direction < 0) {
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.game.loadedImages.playerSprite,
                    this.frameIndex * frameWidth, 0, frameWidth, this.game.loadedImages.playerSprite.height,
                    -this.x - this.width, this.y, this.width, this.height
                );
            } else {
                ctx.drawImage(
                    this.game.loadedImages.playerSprite,
                    this.frameIndex * frameWidth, 0, frameWidth, this.game.loadedImages.playerSprite.height,
                    this.x, this.y, this.width, this.height
                );
            }
            ctx.restore();
        }
    }
}

class Mailbox {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 100;
        this.correctAnswer = null;
        this.faceImage = null;
        this.game = game;
    }

    draw(ctx) {
        if (this.game.loadedImages.mailbox) {
            ctx.drawImage(this.game.loadedImages.mailbox, this.x, this.y, this.width, this.height);
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
        this.getRandomWord().then(word => {
            this.finalPuzzleWord = word;
            console.log("Final puzzle word:", this.finalPuzzleWord);
        });
        this.player = new Player(0, this.canvas.height - 150, this.canvas.width, this);
        this.currentMailbox = null;

        this.playerNearMailbox = false;
        this.remainingGuesses = 7;

        this.guessInput = document.getElementById('guessInput');
        this.guessButton = document.getElementById('guessButton');
        this.solveButton = document.getElementById('solveButton');
        this.leftArrow = document.getElementById('leftArrow');
        this.rightArrow = document.getElementById('rightArrow');

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
        this.solveButton.addEventListener('click', () => this.handleSolve());
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

        this.leftArrow.addEventListener('touchstart', () => this.player.direction = -1);
        this.leftArrow.addEventListener('touchend', () => this.player.direction = 0);
        this.rightArrow.addEventListener('touchstart', () => this.player.direction = 1);
        this.rightArrow.addEventListener('touchend', () => this.player.direction = 0);
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
        const touchX = e.touches[0].clientX;
        const diff = touchX - this.touchStartX;
        this.player.direction = Math.sign(diff);
    }

    handleTouchEnd() {
        this.player.direction = 0;
    }

    hideGameElements() {
        this.guessInput.style.display = 'none';
        this.guessButton.style.display = 'none';
        this.solveButton.style.display = 'none';
        this.leftArrow.style.display = 'none';
        this.rightArrow.style.display = 'none';
    }

    showGameElements() {
        this.guessInput.style.display = 'block';
        this.guessButton.style.display = 'block';
        this.solveButton.style.display = 'block';
        if (window.innerWidth <= 768) {
            this.leftArrow.style.display = 'block';
            this.rightArrow.style.display = 'block';
        }
    }

    showTitleScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Dead Drop', this.canvas.width / 2, this.canvas.height / 2 - 20);

        const startButton = document.createElement('button');
        startButton.textContent = 'START MISSION';
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
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        
        const instructions = [
            "Agent, your mission:",
            "1. Locate dead drops (mailboxes)",
            "2. Decrypt intel (guess Wikipedia articles)",
            "3. Collect codewords to uncover the final secret"
        ];
        
        instructions.forEach((line, index) => {
            this.ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 3 + index * 40);
        });

        const playButton = document.createElement('button');
        playButton.textContent = 'Begin Mission';
        playButton.style.position = 'absolute';
        playButton.style.left = '50%';
        playButton.style.top = '70%';
        playButton.style.transform = 'translateX(-50%)';
        document.body.appendChild(playButton);

        playButton.addEventListener('click', () => {
            playButton.remove();
            this.startGame();
        });
    }

    async handleGuess(userGuess) {
        console.log('Handling guess:', userGuess);
        if (!this.playerNearMailbox) {
            console.log('Player not near mailbox');
            return;
        }

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

        this.guessInput.value = '';
    }

    isCorrectGuess(guess, correctAnswer) {
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
        this.hint = hint;
    }

    handleCorrectGuess() {
        this.hint = "Correct! You've uncovered a letter.";
        this.addLetterToCollection();
        this.remainingGuesses = 7;
        setTimeout(() => {
            this.loadNewMailbox();
        }, 1500);
    }

    async getRandomWord() {
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            const words = data.title.split(/\s+/).filter(word => 
                word.length > 3 && !word.includes('(') && !word.includes(')')
            );
            
            if (words.length === 0) {
                return this.getRandomWord();
            }
            
            const randomWord = words[Math.floor(Math.random() * words.length)];
            
            return randomWord.toUpperCase();
        } catch (error) {
            console.error('Error fetching random word:', error);
            return "PUZZLE";
        }
    }

    addLetterToCollection() {
        const newLetter = this.finalPuzzleWord[this.lettersCollected.length];
        this.lettersCollected.push(newLetter);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.imagesLoaded) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
            this.player.draw(this.ctx);
            if (this.currentMailbox) {
                this.drawMailboxAndImage();
            }
            this.drawHintArea();
            this.drawLettersCollected();
        }
    }

    drawMailboxAndImage() {
        const mailboxX = (this.canvas.width - this.currentMailbox.width) / 2;
        const mailboxY = this.canvas.height - 150;
        this.currentMailbox.x = mailboxX;
        this.currentMailbox.y = mailboxY;
        this.currentMailbox.draw(this.ctx);

        if (this.currentMailbox.faceImage) {
            const imgWidth = 200;
            const imgHeight = this.currentMailbox.faceImage.height * (imgWidth / this.currentMailbox.faceImage.width);
            const imgX = mailboxX + this.currentMailbox.width / 2 - imgWidth / 2;
            const imgY = mailboxY - imgHeight - 20;

            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(imgX - 10, imgY - 10, imgWidth + 20, imgHeight + 20);
            this.ctx.strokeStyle = 'gold';
            this.ctx.lineWidth = 5;
            this.ctx.strokeRect(imgX - 10, imgY - 10, imgWidth + 20, imgHeight + 20);

            this.ctx.drawImage(this.currentMailbox.faceImage, imgX, imgY, imgWidth, imgHeight);
        }
    }

    drawHintArea() {
        if (this.hint) {
            const maxWidth = this.canvas.width * 0.8;
            const lineHeight = 30;
            const lines = this.getLines(this.ctx, this.hint, maxWidth);

            const textHeight = lines.length * lineHeight;
            const rectHeight = textHeight + 40;
            const rectY = 70;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, rectY, this.canvas.width - 20, rectHeight);

            this.ctx.font = '18px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'left';
            lines.forEach((line, index) => {
                this.ctx.fillText(line, 20, rectY + 30 + index * lineHeight);
            });
        }
    }

    drawLettersCollected() {
        const text = `Letters: ${this.lettersCollected.join(' ')}`;
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = 'yellow';
        this.ctx.textAlign = 'left';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        this.ctx.fillText(text, 20, 40);
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    getLines(ctx, text, maxWidth) {
        const words = text.split(" ");
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
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
            const img = new Image();
            img.src = data.thumbnail.source;
            img.onload = () => {
                this.currentMailbox.faceImage = img;
            };
            this.currentMailbox.correctAnswer = data.title.toLowerCase();
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error);
        }
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.player.move();
        this.draw();
        this.checkPlayerMailboxCollision();
        requestAnimationFrame(() => this.gameLoop());
    }

    checkPlayerMailboxCollision() {
        if (this.currentMailbox) {
            const playerRight = this.player.x + this.player.width;
            const playerBottom = this.player.y + this.player.height;
            const mailboxRight = this.currentMailbox.x + this.currentMailbox.width;
            const mailboxBottom = this.currentMailbox.y + this.currentMailbox.height;

            this.playerNearMailbox = (
                this.player.x < mailboxRight &&
                playerRight > this.currentMailbox.x &&
                this.player.y < mailboxBottom &&
                playerBottom > this.currentMailbox.y
            );

            if (this.playerNearMailbox) {
                this.showGameElements();
            } else {
                this.hideGameElements();
            }
        }
    }

    handleSolve() {
        const guess = prompt("Enter your guess for the final word:");
        if (guess && guess.toUpperCase() === this.finalPuzzleWord) {
            alert("Congratulations! You've solved the puzzle!");
            this.endGame(true);
        } else {
            alert("Sorry, that's not correct. Keep trying!");
        }
    }

    endGame(solved = false) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        if (solved) {
            this.ctx.fillText('Congratulations! Mission Accomplished', this.canvas.width / 2, this.canvas.height / 2 - 50);
        } else {
            this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 50);
        }
        this.ctx.fillText(`Final Word: ${this.finalPuzzleWord}`, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`Letters Collected: ${this.lettersCollected.join(' ')}`, this.canvas.width / 2, this.canvas.height / 2 + 50);

        const restartButton = document.createElement('button');
        restartButton.textContent = 'New Mission';
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
        this.finalPuzzleWord = null;
        this.getRandomWord().then(word => {
            this.finalPuzzleWord = word;
            console.log("New final puzzle word:", this.finalPuzzleWord);
        });
        this.player.x = 0;
        this.playerNearMailbox = false;
        this.remainingGuesses = 7;
        this.hideGameElements();
        this.loadNewMailbox();
        this.gameLoop();
    }
}

window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
};
