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
        this.bubbleSize = 200;
    }

    draw(ctx, sprite) {
        super.draw(ctx, sprite);
        if (this.faceImage) {
            this.drawThoughtBubble(ctx);
        }
    }

    drawThoughtBubble(ctx) {
        const bubbleWidth = this.bubbleSize * 1.5;
        const bubbleHeight = this.bubbleSize * 1.2;
        const bubbleX = this.x + this.width + 20;
        const bubbleY = this.y - bubbleHeight / 2;

        // Main bubble
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2, bubbleWidth / 2, bubbleHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Connecting bubbles
        [15, 10, 5].forEach((size, index) => {
            ctx.beginPath();
            ctx.arc(this.x + this.width + 5 + index * 10, this.y + this.height / 2 - index * 5, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Draw image inside bubble
        if (this.faceImage) {
            const aspectRatio = this.faceImage.width / this.faceImage.height;
            let imgWidth = bubbleWidth * 0.8;
            let imgHeight = imgWidth / aspectRatio;

            if (imgHeight > bubbleHeight * 0.8) {
                imgHeight = bubbleHeight * 0.8;
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
        this.solveButton.addEventListener('click', () => this.handleFinalPuzzleGuess(prompt("Enter your guess for the final word:")));

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
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

    showTitleScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
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
        
        this.ctx.font = '18px Arial';
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
    }

    showGuessingUI() {
        document.getElementById('inputArea').style.display = 'flex';
    }

    hideGuessingUI() {
        document.getElementById('inputArea').style.display = 'none';
        this.hintArea.textContent = '';
    }

    displayCollectedLetters() {
        this.lettersCollectedDisplay.textContent = `Letters: ${this.scrambledLetters}`;
        if (this.lettersCollected.length >= 5) {
            this.solveButton.style.display = 'block';
        }
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
            return "Sorry, I'm having trouble thinking of a good hint.";
        }
    }

    async handleGuess(userGuess) {
        if (userGuess.toLowerCase() === this.currentNPC.correctAnswer.toLowerCase()) {
            this.hintArea.textContent = 'Correct! You guessed the Wikipedia entry.';
            this.addLetterToCollection();
            this.startNextLevel();
        } else {
            const hint = await this.generateHint(userGuess, this.currentNPC.correctAnswer);
            this.hintArea.textContent = `Incorrect. Hint: ${hint}`;
        }
        this.guessInput.value = ''; // Clear input after guess
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
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/title');
            const data = await response.json();
            return data.items[0].title.split(' ')[0].toUpperCase();
        } catch (error) {
            console.error('Error fetching random word:', error);
            return "PUZZLE"; // Fallback word
        }
    }

    async startNextLevel() {
        this.questStage++;
        this.loadNewNPC();
    }

    async handleFinalPuzzleGuess(puzzleGuess) {
        if (puzzleGuess.toUpperCase() === this.finalPuzzleWord) {
            this.hintArea.textContent = "Congratulations! You solved the final puzzle!";
        } else {
            this.hintArea.textContent = "Incorrect puzzle guess. Keep collecting letters!";
        }
    }

    startGame() {
        this.canvas.style.display = 'block';
        document.getElementById('inputArea').style.display = 'flex';
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
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
    game.showTitleScreen();
});
