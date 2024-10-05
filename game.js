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
    }

    draw(ctx, sprite) {
        super.draw(ctx, sprite);
        if (this.faceImage) {
            this.drawThoughtBubble(ctx);
            ctx.drawImage(this.faceImage, this.x + 80, this.y - 150, 160, 160); // Position to the right, larger image
        }
    }

    drawThoughtBubble(ctx) {
        ctx.beginPath();
        ctx.arc(this.x + 140, this.y - 60, 90, 0, Math.PI * 2, true); // Bigger, positioned to the right
        ctx.moveTo(this.x + 60, this.y - 30);
        ctx.lineTo(this.x + 50, this.y - 10);
        ctx.lineTo(this.x + 60, this.y + 10);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
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
        this.questStage = 0;
        this.player = new Player(0, 250, this.canvas.width);
        this.currentNPC = null;

        this.playerNearNPC = false;
    }

    async loadNewNPC() {
        this.currentNPC = new NPC(300, 250, `NPC ${this.questStage + 1}`);
        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.currentNPC.faceImage = img;
                    this.currentNPC.correctAnswer = data.title.toLowerCase();
                    console.log(`Loaded NPC image for ${this.currentNPC.name}`);
                };
            } else {
                console.error('Failed to load Wikipedia image.');
            }
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

            if (this.currentNPC && Math.abs(this.player.x - this.currentNPC.x) < 50) {
                this.playerNearNPC = true;
            } else {
                this.playerNearNPC = false;
            }
        }

        if (this.currentNPC) {
            this.currentNPC.draw(this.ctx, this.npcSprite);
        }

        this.displayScrambledLetters();
    }

    displayScrambledLetters() {
        if (this.lettersCollected.length > 0) {
            const scrambled = this.lettersCollected.sort(() => Math.random() - 0.5).join('');
            this.ctx.font = '20px Arial';
            this.ctx.fillStyle = 'black';
            this.ctx.fillText(`Letters collected (scrambled): ${scrambled}`, 10, 30);
        }
    }

    async generateHint(userGuess, correctAnswer) {
        try {
            const response = await fetch('https://api.openai.com/v1/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer YOUR_OPENAI_API_KEY`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    prompt: `Give a helpful hint based on the player's guess: "${userGuess}". The correct answer is "${correctAnswer}". Make the hint more detailed and specific to guide them.`,
                    max_tokens: 60,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].text.trim();
        } catch (error) {
            console.error("Error generating hint:", error);
            return "Sorry, I'm having trouble thinking of a good hint.";
        }
    }

    async handleGuess(userGuess) {
        if (userGuess.toLowerCase() === this.currentNPC.correctAnswer) {
            alert('Correct! You guessed the Wikipedia entry.');
            this.lettersCollected.push(this.getRandomLetter());
            this.startNextLevel();
        } else {
            const hint = await this.generateHint(userGuess, this.currentNPC.correctAnswer);
            alert(`Incorrect guess. Hint: ${hint}`);
        }
    }

    getRandomLetter() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    async startNextLevel() {
        this.questStage++;
        this.loadNewNPC();
    }

    startGame() {
        this.canvas.style.display = 'block';
        this.player = new Player(0, 250, this.canvas.width);
        this.questStage = 0;
        this.lettersCollected = [];
        this.loadNewNPC();
        this.start();
    }

    start() {
        const gameLoop = () => {
            this.update();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();

        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.handleInteraction(x, y);
        });

        document.addEventListener('keydown', (event) => {
            if (event.code === 'ArrowRight') {
                this.player.isMoving = true;
            } else if (event.code === 'Enter' && this.playerNearNPC) {
                const userGuess = prompt('Enter your guess for the Wikipedia entry:');
                this.handleGuess(userGuess);
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.code === 'ArrowRight') {
                this.player.isMoving = false;
            }
        });
    }

    handleInteraction(x, y) {
        if (this.currentNPC &&
            x >= this.currentNPC.x && x <= this.currentNPC.x + this.currentNPC.width &&
            y >= this.currentNPC.y && y <= this.currentNPC.y + this.currentNPC.height) {
            console.log(`Interacted with ${this.currentNPC.name}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
    game.showTitleScreen();
});
