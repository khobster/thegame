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

            #imageContainer {
                text-align: center;
                margin-bottom: 10px;
            }

            #imageContainer h2 {
                font-size: 20px;
                margin-bottom: 10px;
            }

            #cashDisplay {
                font-size: 18px;
                margin-bottom: 10px;
            }

            #optionsContainer {
                width: 80%;
                max-width: 600px;
            }

            .option-image {
                box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            }

            #navigationControls button:hover {
                background-color: rgba(76, 175, 80, 0.8);
            }

            #wagerInput {
                font-size: 16px;
            }

            #placeWagerButton {
                font-size: 16px;
            }
        `;
        document.head.appendChild(document.createElement('style')).textContent = styles;
    }

    showTitleScreen() {
        this.gamePhase = 'title';
        this.imageContainer.innerHTML = '<h1>Dead Drop</h1>';
        this.cashDisplay.textContent = '';
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
            this.displayWagerInput();

            this.cashDisplay.textContent = `Cash: $${this.cash.toLocaleString()}`;

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
        imageElement.style.height = '50vh';
        imageElement.style.objectFit = 'contain';
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
        navigationDiv.style.alignItems = 'center';
        navigationDiv.style.marginTop = '10px';

        const prevButton = this.createNavButton('←', () => this.navigateImages(-1));
        const nextButton = this.createNavButton('→', () => this.navigateImages(1));
        const selectButton = this.createButton('Select This Image', () => this.handleGuess(this.imageOptions[this.currentImageIndex]));

        navigationDiv.appendChild(prevButton);
        navigationDiv.appendChild(selectButton);
        navigationDiv.appendChild(nextButton);

        this.optionsContainer.appendChild(navigationDiv);
    }

    createNavButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', onClick);
        button.style.padding = '5px 10px';
        button.style.fontSize = '20px';
        button.style.borderRadius = '50%';
        button.style.border = 'none';
        button.style.backgroundColor = 'rgba(76, 175, 80, 0.5)';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        return button;
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

    displayWagerInput() {
        const wagerDiv = document.createElement('div');
        wagerDiv.style.marginTop = '10px';
        wagerDiv.style.display = 'flex';
        wagerDiv.style.justifyContent = 'center';
        wagerDiv.style.alignItems = 'center';

        const wagerInput = document.createElement('input');
        wagerInput.type = 'number';
        wagerInput.id = 'wagerInput';
        wagerInput.style.marginRight = '10px';
        wagerInput.style.padding = '5px';
        wagerInput.style.width = '100px';

        const wagerButton = this.createButton('Place Wager', () => this.handleWager());
        wagerButton.id = 'placeWagerButton';

        wagerDiv.appendChild(wagerInput);
        wagerDiv.appendChild(wagerButton);
        this.optionsContainer.appendChild(wagerDiv);
    }

    navigateImages(direction) {
        this.currentImageIndex = (this.currentImageIndex + direction + this.imageOptions.length) % this.imageOptions.length;
        this.displayCurrentImage();
    }

    handleWager() {
        const wagerInput = document.getElementById('wagerInput');
        const wager = parseInt(wagerInput.value) || 0;
        if (wager <= 0 || wager > this.cash) {
            this.showMessage('Invalid wager amount!');
            return;
        }
        this.currentWager = wager;
        wagerInput.style.display = 'none';
        document.getElementById('placeWagerButton').style.display = 'none';
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
