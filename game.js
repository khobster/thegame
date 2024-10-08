class DeadDropGame {
    constructor() {
        this.cash = 1000;
        this.targetAmount = 1000000; // $1 million
        this.currentQuestion = 0;
        this.currentWager = 0;
        this.answerOptions = [];
        this.correctAnswer = '';
        this.gamePhase = 'title';

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
        this.gamePhase = 'wager';

        try {
            const article = await this.getRandomArticleWithImage();
            this.correctAnswer = article.title;

            const img = document.createElement('img');
            img.src = article.thumbnail.source;
            this.imageContainer.innerHTML = '';
            this.imageContainer.appendChild(img);

            this.cashDisplay.textContent = `Cash: $${this.cash.toLocaleString()}`;
            this.wagerInput.style.display = 'block';
            this.wagerInput.value = this.cash; // Set default wager to all current cash
            this.wagerInput.max = this.cash; // Limit wager to current cash amount

            this.optionsContainer.innerHTML = '<button class="option-button" id="placeWagerButton">Place Wager</button>';
            document.getElementById('placeWagerButton').addEventListener('click', () => this.handleWager());

            this.answerOptions = await this.generateAnswerOptions(article.title);
        } catch (error) {
            console.error('Error loading question:', error);
            this.loadNewQuestion(); // Try again
        }
    }

    async getRandomArticleWithImage() {
        const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await response.json();
        if (data.thumbnail && data.thumbnail.source) {
            return data;
        }
        return this.getRandomArticleWithImage(); // Recursively try again
    }

    async generateAnswerOptions(correctAnswer) {
        let options = [correctAnswer];
        const relatedArticles = await this.getRelatedArticles(correctAnswer);
        
        // Add up to 3 incorrect options
        for (let i = 0; i < 3 && i < relatedArticles.length; i++) {
            options.push(relatedArticles[i].title);
        }

        // If we don't have enough options, add some random ones
        while (options.length < 4) {
            const randomArticle = await this.getRandomArticleWithImage();
            options.push(randomArticle.title);
        }

        return this.shuffleArray(options);
    }

    async getRelatedArticles(title) {
        const encodedTitle = encodeURIComponent(title);
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedTitle}&format=json&origin=*&srlimit=10`;
        
        const response = await fetch(url);
        const data = await response.json();
        return data.query.search.filter(item => item.title !== title);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    handleWager() {
        const wager = parseInt(this.wagerInput.value) || 0;
        if (wager <= 0 || wager > this.cash) {
            this.showMessage('Invalid wager amount!');
            return;
        }
        this.currentWager = wager;
        this.wagerInput.style.display = 'none';
        this.showAnswerOptions();
    }

    showAnswerOptions() {
        this.optionsContainer.innerHTML = '';
        this.answerOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-button';
            button.addEventListener('click', () => this.handleGuess(option));
            this.optionsContainer.appendChild(button);
        });
    }

    handleGuess(userGuess) {
        const isCorrect = userGuess === this.correctAnswer;

        if (isCorrect) {
            this.cash += this.currentWager;
            this.showMessage(`Correct! You've earned $${this.currentWager.toLocaleString()}.`);
            
            if (this.cash >= this.targetAmount) {
                this.endGame(true);
            } else {
                setTimeout(() => this.loadNewQuestion(), 2000);
            }
        } else {
            this.endGame(false);
        }
    }

    showMessage(message) {
        const messageBox = document.createElement('div');
        messageBox.id = 'messageBox';
        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        setTimeout(() => messageBox.remove(), 2000);
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
