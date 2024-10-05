class Character {
    constructor(x, y, width, height, name) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.name = name;
        this.frame = 0;
    }

    draw(ctx, sprite) {
        if (sprite) {
            ctx.drawImage(sprite, this.frame * this.width, 0, this.width, this.height, this.x, this.y, this.width, this.height);
        } else {
            console.error(`Failed to load sprite for ${this.name}`);
        }
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.fillText(this.name, this.x, this.y - 10);
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
            ctx.drawImage(this.faceImage, this.x - 35, this.y - 175, 120, 120);
        } else {
            console.error(`Failed to load face image for ${this.name}`);
        }
    }

    drawThoughtBubble(ctx) {
        ctx.beginPath();
        ctx.arc(this.x + 30, this.y - 140, 80, 0, Math.PI * 2, true);
        ctx.moveTo(this.x + 15, this.y - 60);
        ctx.lineTo(this.x + 5, this.y - 40);
        ctx.lineTo(this.x + 15, this.y - 20);
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
        this.background.onload = () => {
            console.log('Background image loaded.');
        };
        this.background.onerror = () => {
            console.error('Failed to load background image.');
        };

        this.playerSprite = new Image();
        this.playerSprite.src = 'player_sprite.png';
        this.playerSprite.onload = () => {
            console.log('Player sprite loaded.');
        };
        this.playerSprite.onerror = () => {
            console.error('Failed to load player sprite.');
        };

        this.npcSprite = new Image();
        this.npcSprite.src = 'npc_sprite_0.png';
        this.npcSprite.onload = () => {
            console.log('NPC sprite loaded.');
        };
        this.npcSprite.onerror = () => {
            console.error('Failed to load NPC sprite.');
        };

        this.lettersCollected = [];
        this.player = new Player(0, 250, this.canvas.width);
        this.currentNPC = null;
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
        if (this.background) {
            this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            console.error('Background is not loaded.');
        }
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
        } else {
            console.error('No NPC is loaded.');
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

    start() {
        console.log('Game started.');
        const gameLoop = () => {
            this.update();
            requestAnimationFrame(gameLoop);
        };
        this.loadNewNPC().then(() => gameLoop());

        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.handleInteraction(x, y);
        });

        document.addEventListener('keydown', (event) => {
            if (event.code === 'Enter') {
                const userGuess = prompt('Enter your guess for the Wikipedia entry:');
                this.handleGuess(userGuess);
            }
        });
    }

    async handleGuess(userGuess) {
        if (userGuess.toLowerCase() === this.currentNPC.correctAnswer) {
            alert('Correct! You guessed the Wikipedia entry.');
            this.startNextLevel();
        } else {
            alert('Incorrect guess.');
        }
    }

    async startNextLevel() {
        this.questStage++;
        this.loadNewNPC();
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
    game.start();
});
