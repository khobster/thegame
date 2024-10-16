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

    addFonts() {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Permanent+Marker&family=Roboto:wght@400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    addStyles() {
        const styles = `
            body {
                font-family: 'Roboto', sans-serif;
                background-color: #1a1a1a;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            #gameContainer {
                width: 100%;
                max-width: 600px;
                text-align: center;
            }
            h1 {
                font-family: 'Bangers', cursive;
                font-size: 64px;
                margin-bottom: 20px;
                color: #FFD700;
                text-shadow: 3px 3px 0 #FF4500;
            }
            h2 {
                font-family: 'Bangers', cursive;
                font-size: 32px;
                margin-bottom: 20px;
                color: #00CED1;
            }
            .button {
                background-color: #FF6347;
                border: none;
                color: white;
                padding: 15px 32px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 18px;
                margin: 4px 2px;
                cursor: pointer;
                border-radius: 25px;
                font-family: 'Permanent Marker', cursive;
                transition: all 0.3s;
            }
            .button:hover {
                background-color: #FF4500;
                transform: scale(1.05);
            }
            .button:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            #cashDisplay {
                font-size: 24px;
                margin-bottom: 20px;
                font-family: 'Bangers', cursive;
                color: #32CD32;
            }
            #wagerInput {
                font-size: 18px;
                padding: 10px;
                width: 100px;
                margin-right: 10px;
                border-radius: 15px;
                border: 2px solid #FF6347;
            }
            .image-container {
                position: relative;
                width: 100%;
                height: 300px;
                margin-bottom: 20px;
                perspective: 1000px;
                cursor: pointer;
            }
            .image-container img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 15px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.5);
                transition: transform 0.6s;
                transform-style: preserve-3d;
            }
            #wagerSection, #selectSection {
                transition: opacity 0.3s ease-in-out;
            }
        `;
        document.head.appendChild(document.createElement('style')).textContent = styles;
    }

    showTitleScreen() {
        this.gameContainer.innerHTML = `
            <h1>Dead Drop</h1>
            <button id="startButton" class="button">Start Game</button>
            <p>the double down game.</p>
            <p>hit a million to win.</p>
        `;
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
    }

    startGame() {
        this.cash = 1000;
        this.currentQuestion = 0;
        this.loadNewQuestion();
    }

    async loadNewQuestion() {
        this.currentQuestion++;
        this.showLoadingIndicator();

        try {
            this.imageOptions = await this.getRandomArticles(5);
            this.correctAnswer = this.imageOptions[Math.floor(Math.random() * this.imageOptions.length)];
            this.currentImageIndex = 0;
            this.displayGameScreen();
        } catch (error) {
            console.error('Error loading question:', error);
            this.handleLoadingError();
        }
    }

    displayGameScreen() {
        this.gameContainer.innerHTML = `
            <h2>${this.correctAnswer.title}</h2>
            <div id="cashDisplay">Cash: $${this.cash.toLocaleString()}</div>
            <div class="image-container">
                <img id="currentImage" src="${this.imageOptions[this.currentImageIndex].thumbnail.source}" alt="Wikipedia Image">
            </div>
            <div id="wagerSection">
                <input type="number" id="wagerInput" placeholder="Enter wager" min="1" max="${this.cash}" value="${this.cash}">
                <button id="placeWagerButton" class="button">Place Wager</button>
            </div>
            <div id="selectSection" style="display: none;">
                <button id="selectImageButton" class="button">Select This Image</button>
            </div>
        `;

        document.getElementById('currentImage').addEventListener('click', () => this.navigateImages(1));
        document.getElementById('placeWagerButton').addEventListener('click', () => this.handleWager());
        document.getElementById('selectImageButton').addEventListener('click', () => this.handleGuess(this.imageOptions[this.currentImageIndex]));

        this.currentWager = this.cash;
        this.hideLoadingIndicator();
    }

    navigateImages(direction) {
        const image = document.getElementById('currentImage');
        image.style.transform = `rotateY(${direction > 0 ? '' : '-'}90deg)`;
        
        setTimeout(() => {
            this.currentImageIndex = (this.currentImageIndex + direction + this.imageOptions.length) % this.imageOptions.length;
            image.src = this.imageOptions[this.currentImageIndex].thumbnail.source;
            image.style.transform = 'rotateY(0deg)';
        }, 150);
    }

    handleWager() {
        const wagerInput = document.getElementById('wagerInput');
        const wager = parseInt(wagerInput.value) || 0;
        if (wager <= 0 || wager > this.cash) {
            this.showMessage('Invalid wager amount!');
            return;
        }
        this.currentWager = wager;
        document.getElementById('wagerSection').style.display = 'none';
        document.getElementById('selectSection').style.display = 'block';
        this.showMessage(`Wager placed: $${this.currentWager.toLocaleString()}`);
    }

    handleGuess(guessedArticle) {
        const isCorrect = guessedArticle.pageid === this.correctAnswer.pageid;

        if (isCorrect) {
            this.cash += this.currentWager;
            this.showMessage(`Correct! You've earned $${this.currentWager.toLocaleString()}.`);
            
            if (this.cash >= this.targetAmount) {
                this.endGame(true);
            } else {
                setTimeout(() => this.loadNewQuestion(), 2000);
            }
        } else {
            this.cash -= this.currentWager;
            if (this.cash <= 0) {
                this.endGame(false);
            } else {
                this.showMessage(`Incorrect. You've lost $${this.currentWager.toLocaleString()}.`);
                setTimeout(() => this.loadNewQuestion(), 2000);
            }
        }
    }

    async getRandomArticles(count) {
        const articles = [];
        for (let i = 0; i < count; i++) {
            const article = await this.getRandomArticle();
            if (article.thumbnail && article.thumbnail.source) {
                articles.push(article);
            } else {
                i--; // Try again if no image
            }
        }
        return articles;
    }

    async getRandomArticle() {
        const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
        return await response.json();
    }

    showLoadingIndicator() {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loadingIndicator';
        loadingIndicator.textContent = 'Loading...';
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.padding = '10px';
        loadingIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.borderRadius = '5px';
        this.gameContainer.appendChild(loadingIndicator);
    }

    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    handleLoadingError() {
        this.hideLoadingIndicator();
        this.showMessage('Error loading question. Please try again.');
        this.gameContainer.innerHTML = '<button class="button" id="retryButton">Retry</button>';
        document.getElementById('retryButton').addEventListener('click', () => this.loadNewQuestion());
    }

    endGame(isWinner) {
        if (isWinner) {
            this.showMessage(`Congratulations! You've won $${this.cash.toLocaleString()}!`);
        } else {
            this.showMessage(`Game Over! You've lost with $${this.cash.toLocaleString()}.`);
        }
        setTimeout(() => {
            this.showTitleScreen();
        }, 3000);
    }

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
