class DeadDropGame {
    constructor() {
        this.cash = 1000;
        this.targetAmount = 1000000;
        this.currentQuestion = 0;
        this.currentWager = 0;
        this.correctAnswer = null;
        this.gamePhase = 'title';
        this.currentImageIndex = 0;
        this.imageOptions = [];

        this.gameContainer = document.getElementById('gameContainer');
        this.addFonts();
        this.addStyles();
        this.showTitleScreen();
    }

    // ... (all other methods remain the same)

    showMessage(message) {
        const messageBox = document.createElement('div');
        messageBox.textContent = message;
        messageBox.style.position = 'fixed';
        messageBox.style.top = '50%';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translate(-50%, -50%) scale(0.5)';
        messageBox.style.backgroundColor = '#FF6347';
        messageBox.style.color = 'white';
        messageBox.style.padding = '20px';
        messageBox.style.borderRadius = '25px';
        messageBox.style.fontFamily = "'Bangers', cursive";
        messageBox.style.fontSize = '24px';
        messageBox.style.textAlign = 'center';
        messageBox.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
        messageBox.style.zIndex = '1000';
        messageBox.style.opacity = '0';
        messageBox.style.transition = 'all 0.3s ease-in-out';

        document.body.appendChild(messageBox);

        // Animate in
        setTimeout(() => {
            messageBox.style.opacity = '1';
            messageBox.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50);

        // Animate out
        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.style.transform = 'translate(-50%, -50%) scale(0.5)';
        }, 1700);

        setTimeout(() => messageBox.remove(), 2000);
    }
}

window.onload = () => new DeadDropGame();
