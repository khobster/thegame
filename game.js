class DeadDropGame {
    constructor() {
        this.cash = 1000;
        this.targetAmount = 1000000; // $1 million
        this.currentQuestion = 0;
        this.currentWager = 0;
        this.correctAnswer = null;
        this.gamePhase = 'title';
        this.currentImageIndex = 0;
        this.imageOptions = [];

        this.imageContainer = document.getElementById('imageContainer');
        this.cashDisplay = document.getElementById('cashDisplay');
        this.wagerInput = document.getElementById('wagerInput');
        this.optionsContainer = document.getElementById('optionsContainer');

        this.addStyles();
        this.showTitleScreen();
    }

    addStyles() {
        const styles = `
            body {
                font-family: Arial, sans-serif;
                background-color: #1a1a1a;
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                padding: 20px;
                box-sizing: border-box;
            }

            #imageContainer h2 {
                font-size: 24px;
                margin-bottom: 20px;
                text-align: center;
            }

            #cashDisplay {
                font-size: 20px;
                margin-bottom: 20px;
            }

            #optionsContainer {
                width: 80%;
                max-width: 800px;
            }

            .option-image {
                box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            }

            #navigationControls button:hover {
                background-color: #45a049;
            }

            #wagerInput {
                margin-top: 20px;
                padding: 10px;
                font-size: 16px;
                width: 100%;
                max-width: 200px;
            }

            #placeWagerButton {
                margin-top: 10px;
                padding: 10px 20px;
                font-size: 16px;
                background-color: #008CBA;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }

            #placeWagerButton:hover {
                background-color: #007B9A;
            }
        `;
        document.head.appendChild(document.createElement('style')).textContent = styles;
    }

    showTitleScreen() {
        this.gamePhase = 'title';
        this.imageContainer.innerHTML = '<h1>Dead Drop</h1>';
        this.cashDisplay.textContent = '';
        this.wagerInput.style.display = 'none';
        this.optionsContainer.innerHTML = `
            <button class="option-button" id="startButton">Start Game</button>
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
        this.gamePhase = 'loading';
        this.showLoadingIndicator();

        try {
            this.imageOptions = await this.getRandomArticles(5);
            this.correctAnswer = this.imageOptions[Math.floor(Math.random() * this.imageOptions.length)];
            this.currentImageIndex = 0;

            this.displayQuestionTitle(this.correctAnswer.title);
            this.setupImageContainer();
            this.displayCurrentImage();
            this.displayNavigationControls();

            this.cashDisplay.textContent = `Cash: $${this.cash.toLocaleString()}`;
            this.wagerInput.style.display = 'block';
            this.wagerInput.value = this.cash;
            this.wagerInput.max = this.cash;

            const wagerButton = this.createButton('Place Wager', () => this.handleWager());
            wagerButton.id = 'placeWagerButton';
            this.optionsContainer.appendChild(wagerButton);

            this.hideLoadingIndicator();
            this.gamePhase = 'wager';
        } catch (error) {
            console.error('Error loading question:', error);
            this.handleLoadingError();
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

    displayQuestionTitle(title) {
        this.imageContainer.innerHTML = `<h2>"${title}"</h2>`;
    }

    setupImageContainer() {
        this.optionsContainer.innerHTML = '';
        const imageElement = document.createElement('img');
        imageElement.id = 'currentImage';
        imageElement.className = 'option-image';
        imageElement.style.width = '100%';
        imageElement.style.height = '70vh';
        imageElement.style.objectFit = 'cover';
        imageElement.style.borderRadius = '10px';
        this.optionsContainer.appendChild(imageElement);
    }

    displayCurrentImage() {
        const article = this.imageOptions[this.currentImageIndex];
        const imageElement = document.getElementById('currentImage');
        imageElement.src = article.thumbnail.source;
        imageElement.alt = article.title;
    }

    displayNavigationControls() {
        const navigationDiv = document.createElement('div');
        navigationDiv.id = 'navigationControls';
        navigationDiv.style.display = 'flex';
        navigationDiv.style.justifyContent = 'space-between';
        navigationDiv.style.marginTop = '20px';

        const prevButton = this.createButton('← Previous', () => this.navigateImages(-1));
        const selectButton = this.createButton('Select This Image', () => this.handleGuess(this.imageOptions[this.currentImageIndex]));
        const nextButton = this.createButton('Next →', () => this.navigateImages(1));

        navigationDiv.appendChild(prevButton);
        navigationDiv.appendChild(selectButton);
        navigationDiv.appendChild(nextButton);

        this.optionsContainer.appendChild(navigationDiv);
    }

    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', onClick);
        button.style.padding = '10px 20px';
        button.style.fontSize = '16px';
        button.style.borderRadius = '5px';
        button.style.border = 'none';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        return button;
    }

    navigateImages(direction) {
        this.currentImageIndex = (this.currentImageIndex + direction + this.imageOptions.length) % this.imageOptions.length;
        this.displayCurrentImage();
    }

    handleWager() {
        const wager = parseInt(this.wagerInput.value) || 0;
        if (wager <= 0 || wager > this.cash) {
            this.showMessage('Invalid wager amount!');
            return;
        }
        this.currentWager = wager;
        this.wagerInput.style.display = 'none';
        this.gamePhase = 'guessing';
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

    showMessage(message) {
        const messageBox = document.createElement('div');
        messageBox.id = 'messageBox';
        messageBox.textContent = message;
        messageBox.style.position = 'fixed';
        messageBox.style.top = '50%';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translate(-50%, -50%)';
        messageBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        messageBox.style.color = 'white';
        messageBox.style.padding = '20px';
        messageBox.style.borderRadius = '10px';
        messageBox.style.zIndex = '1000';
        document.body.appendChild(messageBox);
        setTimeout(() => messageBox.remove(), 2000);
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
        document.body.appendChild(loadingIndicator);
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
        this.optionsContainer.innerHTML = '<button class="option-button" id="retryButton">Retry</button>';
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
}

window.onload = () => {
    new DeadDropGame();
};
