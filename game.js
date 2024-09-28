// Character classes
class Character {
    constructor(x, y, width, height, color, name) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.name = name;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(this.name, this.x, this.y - 5);
    }
}

class Player extends Character {
    constructor(x, y) {
        super(x, y, 30, 50, 'blue', 'Player');
        this.speed = 2;
    }

    move() {
        this.x += this.speed;
        if (this.x > game.canvas.width) {
            this.x = -this.width;
        }
    }
}

class NPC extends Character {
    constructor(x, y, name) {
        super(x, y, 30, 50, 'green', name);
    }
}

// Dialogue system
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

// API interaction
const API_KEY = 'YOUR_OPENAI_API_KEY'; // Replace with your actual API key

async function generateAIDialogue(context) {
    try {
        const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                prompt: `In a fantasy world, ${context}\nNPC:`,
                max_tokens: 50,
                n: 1,
                stop: null,
                temperature: 0.7,
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].text.trim();
    } catch (error) {
        console.error("Error generating AI dialogue:", error);
        return "Sorry, I'm having trouble thinking of what to say.";
    }
}

// Game class
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 400;
        
        this.player = new Player(0, 200);
        this.npcs = [
            new NPC(300, 200, 'Bob'),
            new NPC(600, 200, 'Alice'),
            new NPC(900, 200, 'Charlie')
        ];
        this.dialogueManager = new DialogueManager();
    }

    drawBackground() {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, 300, this.canvas.width, 100);
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        this.player.move();
        this.player.draw(this.ctx);
        
        this.npcs.forEach(npc => npc.draw(this.ctx));
    }

    async handleInteraction() {
        const nearbyNPC = this.npcs.find(npc => Math.abs(this.player.x - npc.x) < 50);
        if (nearbyNPC) {
            const context = `The player meets ${nearbyNPC.name}. The player is on a quest to find a magical artifact.`;
            const aiDialogue = await generateAIDialogue(context);
            this.dialogueManager.addDialogue(nearbyNPC.name, aiDialogue);
        }
    }

    start() {
        const gameLoop = () => {
            this.update();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();

        this.canvas.addEventListener('click', () => this.handleInteraction());
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.dialogueManager.showNextDialogue();
            }
        });
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
    game.start();
});
