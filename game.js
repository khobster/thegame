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
        this.correctAnswer = null;  // Wikipedia entry title to guess
    }

    draw(ctx, sprite) {
        super.draw(ctx, sprite);
        if (this.faceImage) {
            // Draw the white thought bubble first
            this.drawThoughtBubble(ctx);
            // Draw the Wikipedia image inside the thought bubble
            ctx.drawImage(this.faceImage, this.x - 35, this.y - 175, 120, 120);  // Adjusted position and size for better alignment
        }
    }

    // Method to draw a solid white thought bubble
    drawThoughtBubble(ctx) {
        ctx.beginPath();
        ctx.arc(this.x + 30, this.y - 140, 80, 0, Math.PI * 2, true); // Draw the bubble circle
        ctx.moveTo(this.x + 15, this.y - 60);
        ctx.lineTo(this.x + 5, this.y - 40);  // Small bubble trail
        ctx.lineTo(this.x + 15, this.y - 20);
        ctx.fillStyle = 'white';  // Set fill to white
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
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

async function generateDynamicHint(userGuess, correctAnswer) {
    try {
        const response = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer YOUR_OPENAI_API_KEY`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4",
                prompt: `You're an NPC trying to help a player guess the correct answer, which is '${correctAnswer}'. The player guessed '${userGuess}'. Provide a hint to help guide the player in the right direction.`,
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
        console.error("Error generating dynamic hint:", error);
        return "Sorry, I'm having trouble thinking of a hint.";
    }
}

class Game {
    constructor(canvasId) {
        console.log('Game constructor called');
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 400;

        this.background = new Image();
        this.background.src = 'background.png';  // Make sure the path to the image is correct

        this.playerSprite = new Image();
        this.playerSprite.src = 'player_sprite.png'; // Make sure this path is correct too

        this.npcSprite = new Image();
        this.npcSprite.src = 'npc_sprite_0.png';

        this.background.onload = () => {
            this.playerSprite.onload = () => {
                this.npcSprite.onload = () => {
                    this.showTitleScreen();
                };
            };
        };

        this.background.onerror = () => {
            console.error("Failed to load the background image.");
        };
    }

    showTitleScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '30px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Spy Street', this.canvas.width / 2 - 80, this.canvas.height / 2 - 20);

        const startButton = document.createElement('button');
        startButton.textContent = 'START GAME';
        startButton.style.position = 'absolute';
        startButton.style.left = '50%';
        startButton.style.top = '60%';
        startButton.style.transform = 'translateX(-50%)';
        startButton.style.backgroundColor = 'red';
        startButton.style.color = 'white';
        startButton.style.fontSize = '20px';
        startButton.style.border = 'none';
        startButton.style.padding = '10px';
        startButton.style.cursor = 'pointer';
        startButton.style.animation = 'blink 1s infinite';
        document.body.appendChild(startButton);

        startButton.addEventListener('click', () => {
            startButton.remove();
            this.showInstructionScreen();
        });

        // Add blinking animation for the "START GAME" button
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes blink {
                50% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    showInstructionScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Instructions:', this.canvas.width / 2 - 50, 100);
        this.ctx.fillText('Guess what the spy on the street (the NPC) is thinking', 50, 150);
        this.ctx.fillText('Each correct guess gives you a letter for the final puzzle.', 50, 200);

        const continueButton = document.createElement('button');
        continueButton.textContent = 'CONTINUE';
        continueButton.style.position = 'absolute';
        continueButton.style.left = '50%';
        continueButton.style.top = '60%';
        continueButton.style.transform = 'translateX(-50%)';
        continueButton.style.backgroundColor = 'blue';
        continueButton.style.color = 'white';
        continueButton.style.fontSize = '20px';
        continueButton.style.border = 'none';
        continueButton.style.padding = '10px';
        document.body.appendChild(continueButton);

        continueButton.addEventListener('click', () => {
            continueButton.remove();
            this.startGame();
        });
    }

    startGame() {
        this.canvas.style.display = 'block';
        this.player = new Player(0, 250, this.canvas.width);
        this.currentNPC = null;
        this.questStage = 0;
        this.guessCount = 0;
        this.lettersCollected = [];
        this.loadNewNPC();
        this.start();
    }

    async loadNewNPC() {
        // Load one NPC for the current level
        this.currentNPC = new NPC(300, 250, `NPC Level ${this.questStage + 1}`);

        try {
            const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            const data = await response.json();
            if (data.thumbnail && data.thumbnail.source) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = data.thumbnail.source;
                img.onload = () => {
                    this.currentNPC.faceImage = img;
                    this.currentNPC.correctAnswer = data.title.toLowerCase();  // Set the correct answer to the Wikipedia entry title
                };
            }
        } catch (error) {
            console.error('Error fetching Wikipedia image:', error);
        }
    }

    drawBackground() {
        if (this.background) {
            this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
        }
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the background first, if it's loaded
        this.drawBackground();
        
        this.player.move();
        this.player.draw(this.ctx, this.playerSprite);

        if (this.currentNPC) {
            this.currentNPC.draw(this.ctx, this.npcSprite);
        }

        // Display the scrambled letters the player has collected
        this.displayScrambledLetters();
    }

    displayScrambledLetters() {
        const scrambled = this.lettersCollected.sort(() => Math.random() - 0.5).join('');
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(`Letters collected (scrambled): ${scrambled}`, 10, 30);
    }

    async handleInteraction(x, y) {
        if (this.currentNPC &&
            x >= this.currentNPC.x && x <= this.currentNPC.x + this.currentNPC.width &&
            y >= this.currentNPC.y && y <= this.currentNPC.y + this.currentNPC.height) {

            this.player.isMoving = false;
            this.currentNPC.frame = 1; // Switch to talking frame
            const context = `The player is talking to ${this.currentNPC.name}. Quest stage: ${this.questStage}`;
            
            try {
                const aiDialogue = await generateAIDialogue(context);
                this.dialogueManager.addDialogue(this.currentNPC.name, aiDialogue);
            } catch (error) {
                console.error("Failed to generate dialogue:", error);
                this.dialogueManager.addDialogue(this.currentNPC.name, "Sorry, I'm having trouble thinking of what to say.");
            }

            this.questStage++;
            this.guessCount = 0;  // Reset guess count for the new NPC
            setTimeout(() => { this.currentNPC.frame = 0; }, 1000); // Switch back to standing frame after 1 second
        }
    }

    async handleGuess(userGuess) {
        this.guessCount++;
        const similarity = this.calculateStringSimilarity(userGuess, this.currentNPC.correctAnswer);

        if (this.guessCount > this.maxGuesses) {
            alert("You've run out of guesses!");
            this.startNextLevel();
        } else if (userGuess.toLowerCase() === this.currentNPC.correctAnswer) {
            alert("Correct! You guessed the Wikipedia entry.");

            // Reward player with a random letter
            const randomLetter = this.getRandomLetter();
            this.lettersCollected.push(randomLetter);
            alert(`You earned the letter: ${randomLetter}`);
            
            this.startNextLevel();
        } else {
            // Generate a dynamic hint using the OpenAI API
            const hint = await generateDynamicHint(userGuess, this.currentNPC.correctAnswer);
            alert(`Incorrect guess. Hint: ${hint}`);
        }
    }

    getRandomLetter() {
        // Get a random letter from the final puzzle word for demo purposes
        const availableLetters = this.finalPuzzleWord.split("").filter(letter => !this.lettersCollected.includes(letter));
        return availableLetters[Math.floor(Math.random() * availableLetters.length)];
    }

    async startNextLevel() {
        this.questStage++;
        await this.loadNewNPC();  // Load new NPC
        this.guessCount = 0;  // Reset guess counter for the new NPC
    }

    calculateStringSimilarity(a, b) {
        let longer = a;
        let shorter = b;
        if (a.length < b.length) {
            longer = b;
            shorter = a;
        }
        const longerLength = longer.length;
        if (longerLength === 0) {
            return 1.0;
        }
        return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    editDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; i <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    handleFinalPuzzleGuess(puzzleGuess) {
        const assembledWord = this.lettersCollected.join('');
        if (puzzleGuess.toUpperCase() === this.finalPuzzleWord) {
            alert("Congratulations! You solved the puzzle.");
        } else {
            alert("That's not correct. Keep collecting letters!");
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
            } else if (event.code === 'ArrowRight') {
                this.player.isMoving = true;
            } else if (event.code === 'Enter') {
                // Temporary guessing mechanism for testing:
                const userGuess = prompt("Enter your guess for the Wikipedia entry:");
                this.handleGuess(userGuess);
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.code === 'ArrowRight') {
                this.player.isMoving = false;
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
