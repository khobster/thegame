class DeadDropGame {
    constructor() {
        this.cash = 1000;
        this.targetAmount = 1000000; // $1 million
        this.currentQuestion = 0;
        this.currentWager = 0;
        this.answerOptions = [];
        this.correctAnswer = null;
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

    loadNewQuestion() {
        this.currentQuestion++;
        this.gamePhase = 'loading';
        this.showLoadingIndicator();

        this.getRandomArticle()
            .then(article => {
                this.correctAnswer = article;
                console.log("Correct answer:", article.title);
                if (article.thumbnail && article.thumbnail.source) {
                    const img = document.createElement('img');
                    img.src = article.thumbnail.source;
                    this.imageContainer.innerHTML = '';
                    this.imageContainer.appendChild(img);
                } else {
                    this.imageContainer.innerHTML = '<p>No image available</p>';
                }

                this.cashDisplay.textContent = `Cash: $${this.cash.toLocaleString()}`;
                this.wagerInput.style.display = 'block';
                this.wagerInput.value = this.cash;
                this.wagerInput.max = this.cash;

                this.optionsContainer.innerHTML = '<button class="option-button" id="placeWagerButton">Place Wager</button>';
                document.getElementById('placeWagerButton').addEventListener('click', () => this.handleWager());

                return this.generateAnswerOptions();
            })
            .then(options => {
                this.answerOptions = options;
                this.hideLoadingIndicator();
                this.gamePhase = 'wager';
            })
            .catch(error => {
                console.error('Error loading question:', error);
                this.handleLoadingError();
            });
    }

    async getRandomArticle() {
        const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await response.json();
        return data;
    }

    async generateAnswerOptions() {
        const correctTitle = this.correctAnswer.title;
        let options = [correctTitle];
        
        // Get categories for the correct answer
        const categories = await this.getCategories(correctTitle);
        
        // Get related articles from these categories
        const relatedArticles = await this.getRelatedArticles(categories);
        
        // Add related articles to options
        for (let article of relatedArticles) {
            if (options.length < 4 && article !== correctTitle) {
                options.push(article);
            }
            if (options.length >= 4) break;
        }

        // If we still need more options, use the extract to generate plausible ones
        while (options.length < 4) {
            const plausibleOption = this.generatePlausibleOption(this.correctAnswer.extract);
            if (!options.includes(plausibleOption)) {
                options.push(plausibleOption);
            }
        }

        return this.shuffleArray(options);
    }

    async getCategories(title) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=categories&titles=${encodeURIComponent(title)}&format=json&origin=*`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const page = Object.values(data.query.pages)[0];
            return page.categories ? page.categories.map(cat => cat.title) : [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    async getRelatedArticles(categories) {
        let articles = [];
        for (let category of categories) {
            const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=5&format=json&origin=*`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                articles = articles.concat(data.query.categorymembers.map(member => member.title));
            } catch (error) {
                console.error('Error fetching related articles:', error);
            }
            if (articles.length >= 3) break;
        }
        return articles;
    }

    generatePlausibleOption(extract) {
        const words = extract.split(' ');
        const randomIndex = Math.floor(Math.random() * (words.length - 2));
        return words.slice(randomIndex, randomIndex + 3).join(' ');
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
        const isCorrect = userGuess === this.correctAnswer.title;

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
