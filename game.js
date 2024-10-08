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

        this.player = new Player(0, this.canvas.height - 150, this.canvas.width, this);
        this.currentMailbox = null;

        this.cash = 1000;
        this.totalQuestions = 10;
        this.currentQuestion = 0;
        this.currentWager = 0;
        this.answerOptions = [];
        this.gamePhase = 'title'; // 'title', 'instructions', 'walking', 'viewing', 'wagering', 'guessing', 'result'
        this.viewingTime = 10;
        this.viewingTimeLeft = 0;
        this.viewingTimer = null;

        this.playerNearMailbox = false;

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
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

        document.getElementById('leftArrow').addEventListener('touchstart', () => this.player.direction = -1);
        document.getElementById('leftArrow').addEventListener('touchend', () => this.player.direction = 0);
        document.getElementById('rightArrow').addEventListener('touchstart', () => this.player.direction = 1);
        document.getElementById('rightArrow').addEventListener('touchend', () => this.player.direction = 0);
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

    showTitleScreen() {
        this.gamePhase = 'title';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '48px Orbitron';
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Dead Drop', this.canvas.width / 2, this.canvas.height / 2 - 50);

        const startButton = document.createElement('button');
        startButton.textContent = 'START MISSION';
        startButton.className = 'option-button';
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
        this.gamePhase = 'instructions';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '24px Roboto Mono';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        
        const instructions = [
            "Agent, your mission:",
            "1. Approach the dead drop (mailbox)",
            "2. Analyze the intel (image)",
            "3. Wager your resources",
            "4. Identify the subject (multiple choice)"
        ];
        
        instructions.forEach((line, index) => {
            this.ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 3 + index * 40);
        });

        const playButton = document.createElement('button');
        playButton.textContent = 'Begin Mission';
        playButton.className = 'option-button';
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

    startGame() {
        this.cash = 1000;
        this.currentQuestion = 0;
        this.gamePhase = 'walking';
        this.loadNewQuestion();
    }

    async loadNewQuestion() {
        if (this.currentQuestion >= this.totalQuestions) {
            this.endGame();
            return;
        }

        this.currentQuestion++;
        this.gamePhase = 'walking';
        this.playerNearMailbox = false;

        try {
            const article = await this.getRandomArticleWithImage();
            this.currentMailbox = new Mailbox(
                Math.random() * (this.canvas.width - 60),
                this.canvas.height - 150,
                this
            );
            this.currentMailbox.correctAnswer = article.title;
            this.currentMailbox.faceImage = new Image();
            this.currentMailbox.faceImage.src = article.thumbnail.source;

            this.answerOptions = await this.generateAnswerOptions(article.title);
        } catch (error) {
            console.error('Error loading question:', error);
            this.loadNewQuestion(); // Try again
        }
    }

    async getRandomArticleWithImage() {
        const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await response.json();
        if (data.thumbnail && data.thumbnail.source) {
            return data;
        }
        return this.getRandomArticleWithImage(); // Recursively try again
    }

    async generateAnswerOptions(correctAnswer) {
        let options = [correctAnswer];
        const relatedArticles = await this.getRelatedArticles(correctAnswer);
        
        // Add up to 3 incorrect options
        for (let i = 0; i < 3 && i < relatedArticles.length; i++) {
            options.push(relatedArticles[i].title);
        }

        // If we don't have enough options, add some random ones
        while (options.length < 4) {
            const randomArticle = await this.getRandomArticleWithImage();
            options.push(randomArticle.title);
        }

        return this.shuffleArray(options);
    }

    async getRelatedArticles(title) {
        const encodedTitle = encodeURIComponent(title);
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedTitle}&format=json&origin=*&srlimit=10`;
        
        const response = await fetch(url);
        const data = await response.json();
        return data.query.search.filter(item => item.title !== title);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
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

            if (this.playerNearMailbox && this.gamePhase === 'walking') {
                this.gamePhase = 'viewing';
                this.startViewingPhase();
            }
        }
    }

    startViewingPhase() {
        this.viewingTimeLeft = this.viewingTime;
        this.viewingTimer = setInterval(() => {
            this.viewingTimeLeft--;
            if (this.viewingTimeLeft <= 0) {
                clearInterval(this.viewingTimer);
                this.gamePhase = 'wagering';
                this.promptForWager();
            }
        }, 1000);
    }

    promptForWager() {
        const wager = prompt(`You have $${this.cash}. How much do you want to wager?`);
        this.currentWager = Math.min(Math.max(parseInt(wager) || 0, 0), this.cash);
        this.gamePhase = 'guessing';
        this.showAnswerOptions();
    }

    showAnswerOptions() {
        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = ''; // Clear previous options

        this.answerOptions.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-button';
            button.addEventListener('click', () => this.handleGuess(option));
            optionsContainer.appendChild(button);
        });
    }

    handleGuess(userGuess) {
        const isCorrect = userGuess === this.currentMailbox.correctAnswer;

        if (isCorrect) {
            this.cash += this.currentWager;
            this.showMessage(`Correct! You've earned $${this.currentWager}.`);
        } else {
            this.cash -= this.currentWager;
            this.showMessage(`Incorrect. You've lost $${this.currentWager}.`);
        }

        this.gamePhase = 'result';
        setTimeout(() => {
            this.loadNewQuestion();
        }, 2000);

        // Clear the options
        document.getElementById('optionsContainer').innerHTML = '';
    }

    showMessage(message) {
        const messageBox = document.createElement('div');
        messageBox.id = 'messageBox';
        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        setTimeout(() => messageBox.remove(), 2000);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.imagesLoaded) {
            this.ctx.drawImage(this.loadedImages.background, 0, 0, this.canvas.width, this.canvas.height);
            this.player.draw(this.ctx);
            if (this.currentMailbox) {
                this.drawMailboxAndImage();
            }
        }

        // Draw cash and question number
        this.ctx.font = '20px Roboto Mono';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Cash: $${this.cash}`, 20, 30);
        this.ctx.fillText(`Question: ${this.currentQuestion}/${this.totalQuestions}`, 20, 60);

        if (this.gamePhase === 'viewing') {
            this.drawViewingTimer();
        }
    }

    drawMailboxAndImage() {
        this.currentMailbox.draw(this.ctx);

        if (this.currentMailbox.faceImage && (this.gamePhase === 'viewing' || this.gamePhase === 'wagering' || this.gamePhase === 'guessing')) {
            const imgWidth = 200;
            const imgHeight = this.currentMailbox.faceImage.height * (imgWidth / this.currentMailbox.faceImage.width);
            const imgX = this.currentMailbox.x + this.currentMailbox.width / 2 - imgWidth / 2;
            const imgY = this.currentMailbox.y - imgHeight - 20;

            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(imgX - 10, imgY - 10, imgWidth + 20, imgHeight + 20);
            this.ctx.strokeStyle = 'gold';
            this.ctx.lineWidth = 5;
            this.ctx.strokeRect(imgX - 10, imgY - 10, imgWidth + 20, imgHeight + 20);

            this.ctx.drawImage(this.currentMailbox.faceImage, imgX, imgY, imgWidth, imgHeight);
        }
    }

    drawViewingTimer() {
        this.ctx.font = '24px Orbitron';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Time: ${this.viewingTimeLeft}s`, this.canvas.width / 2, 30);
    }

    endGame() {
        this.showMessage(`Game Over! Your final score: $${this.cash}`);
        setTimeout(() => {
            if (confirm("Do you want to play again?")) {
                this.resetGame();
            } else {
                this.showTitleScreen();
            }
        }, 2000);
    }

    resetGame() {
        this.cash = 1000;
        this.currentQuestion = 0;
        this.gamePhase = 'walking';
        this.player.x = 0;
        this.loadNewQuestion();
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gamePhase === 'walking') {
            this.player.move();
            this.checkPlayerMailboxCollision();
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.onload = () => {
    const game = new DeadDropGame('gameCanvas');
};
