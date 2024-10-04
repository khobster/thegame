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
        ctx.drawImage(sprite, this.frame * this.width, 0, this.width, this.height, this.x, this.y, this.width, this.height);
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
    }

    move() {
        this.x += this.speed;
        this.frame = (this.frame + 1) % 2;
        if (this.x > this.canvasWidth) {
            this.x = -this.width;
        }
    }
}

class NPC extends Character {
    constructor(x, y, name) {
        super(x, y, 60, 100, name);
        this.faceImage = null;
    }

    draw(ctx, sprite) {
        super.draw(ctx, sprite);
        if (this.faceImage) {
            ctx.drawImage(this.faceImage, this.x, this.y - 60, 60, 60);
        }
    }
}

class DialogueManager {
    constructor() {
        this.dialogueQueue = [];
        this.currentDialogue = null;
        this.dialogueBox = document.getElementById('dialogueBox');
    }

    addDialogue(speaker, text) {
        this.dialogueQueue.push({ speaker, text });
        if (!this.currentDialogue) {
            this.showNextDialogue();
        }
    }

    showNextDialogue() {
        if (this.dialogueQueue.length > 0) {
            this.currentDialogue = this.dialogueQueue.shift();
            this.dialogueBox.innerHTML = `<strong>${this.currentDialogue.speaker}:</strong> ${this.currentDialogue.text}`;
        } else {
            this.currentDialogue = null;
            this.dialogueBox.innerHTML = '';
        }
    }
}

async function generateAIDialogue(context) {
    try {
        const response = await fetch('https://us-central1-thegame-91290.cloudfunctions.net/generateDialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: `In a quirky world reminiscent of The Big Lebowski, ${context}\nNPC:`,
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.text.trim();
    } catch (error) {
        console.error("Error generating AI dialogue:", error);
        return "Sorry, I'm having trouble thinking of what to say.";
    }
}

class Game {
    constructor(canvasId) {
        console.log('Game constructor called');
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 400;
        
        this.player = new Player(0, 250, this.canvas.width);
        this.npcs = [
            new NPC(300, 250, 'The Dude'),
            new NPC(600, 250, 'Walter'),
            new NPC(900, 250, 'Donny')
        ];
        this.dialogueManager = new DialogueManager();

        this.background = new Image();
        this.background.src = 'background.png';
        
        this.playerSprite = new Image();
        this.playerSprite.src = 'player_sprite.png';
        
        this.npcSprites = [];
        for (let i = 0; i < 3; i++) {
            let sprite = new Image();
            sprite.src = `npc_sprite_${i}.png`;
            this.npcSprites.push(sprite);
        }
        
        this.questStage = 0;

        this.loadWikipediaFaces();
    }

    async loadWikipediaFaces() {
        for (let npc of this.npcs) {
            try {
                const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
                const data = await response.json();
                if (data.thumbnail && data.thumbnail.source) {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = data.thumbnail.source;
                    img.onload = () => {
                        npc.faceImage = img;
                    };
                }
            } catch (error) {
                console.error('Error fetching Wikipedia image:', error);
            }
        }
    }

    drawBackground() {
        this.ctx.drawImage(this.background, 0, 0);
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        this.player.move();
        this.player.draw(this.ctx, this.playerSprite);
        
        this.npcs.forEach((npc, index) => {
            npc.draw(this.ctx, this.npcSprites[index % this.npcSprites.length]);
        });
    }

    async handleInteraction(x, y) {
        const clickedNPC = this.npcs.find(npc => 
            x >= npc.x && x <= npc.x + npc.width &&
            y >= npc.y && y <= npc.y + npc.height
        );

        if (clickedNPC) {
            clickedNPC.frame = 1; // Switch to talking frame
            const context = `The player is looking for a stolen rubber chicken. They are talking to ${clickedNPC.name}. Quest stage: ${this.questStage}`;
            const aiDialogue = await generateAIDialogue(context);
            this.dialogueManager.addDialogue(clickedNPC.name, aiDialogue);
            this.questStage++;
            setTimeout(() => { clickedNPC.frame = 0; }, 1000); // Switch back to standing frame after 1 second
        }
    }

    start() {
        console.log('Game started');
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
            if (event.code === 'Space') {
                this.dialogueManager.showNextDialogue();
            }
        });
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    const game = new Game('gameCanvas');
    game.start();
});
