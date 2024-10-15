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

        this.showTitleScreen();
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
            this.displayCurrentImage();
            this.displayNavigationControls();

            this.cashDisplay.textContent = `Cash: $${this.cash.toLocaleString()}`;
            this.wagerInput.style.display = 'block';
            this.wagerInput.value = this.cash;
            this.wagerInput.max = this.cash;

            this.optionsContainer.innerHTML += '<button class="option-button" id="placeWagerButton">Place Wager</button>';
            document.getElementById('placeWagerButton').addEventListener('click', () => this.handleWager());

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
        this.imageContainer.innerHTML = `<h2>Which image represents: "${title}"?</h2>`;
    }

    displayCurrentImage() {
        const article = this.imageOptions[this.currentImageIndex];
        const img = document.createElement('img');
        img.src = article.thumbnail.source;
        img.alt = article.title;
        img.className = 'option-image';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '70vh';
        img.style.objectFit = 'contain';
        
        this.optionsContainer.innerHTML = '';
        this.optionsContainer.appendChild(img);
    }

    displayNavigationControls() {
        const prevButton = document.createElement('button');
        prevButton.textContent = '← Previous';
        prevButton.addEventListener('click', () => this.navigateImages(-1));

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next →';
        nextButton.addEventListener('click', () => this.navigateImages(1));

        const selectButton = document.createElement('button');
        selectButton.textContent = 'Select This Image';
        selectButton.addEventListener('click', () => this.handleGuess(this.imageOptions[this.currentImageIndex]));

        const navigationDiv = document.createElement('div');
        navigationDiv.appendChild(prevButton);
        navigationDiv.appendChild(selectButton);
        navigationDiv.appendChild(nextButton);

        this.optionsContainer.appendChild(navigationDiv);
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
