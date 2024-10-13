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
            this.wagerInput.value = this.cash;
            this.wagerInput.max = this.cash;

            this.optionsContainer.innerHTML = '<button class="option-button" id="placeWagerButton">Place Wager</button>';
            document.getElementById('placeWagerButton').addEventListener('click', () => this.handleWager());

            this.answerOptions = await this.generateAnswerOptions(article.title);
            console.log("Generated options:", this.answerOptions); // Debug log
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
        
        try {
            const relatedArticles = await this.getRelatedArticles(correctAnswer);
            const randomArticles = await this.getMultipleRandomArticles(5);  // Reduced to 5 for faster loading
            
            let potentialOptions = [...relatedArticles, ...randomArticles];
            potentialOptions = this.shuffleArray(potentialOptions);
            
            for (let article of potentialOptions) {
                if (options.length < 4 && this.isGoodOption(article.title) && !options.includes(article.title)) {
                    options.push(article.title);
                }
            }
        } catch (error) {
            console.error("Error generating options:", error);
        }

        // If we still don't have enough options, add some clever fake options
        while (options.length < 4) {
            const fakeOption = this.generateFakeOption(correctAnswer);
            if (!options.includes(fakeOption)) {
                options.push(fakeOption);
            }
        }

        return this.shuffleArray(options);
    }

    async getMultipleRandomArticles(count) {
        const articles = [];
        for (let i = 0; i < count; i++) {
            const article = await this.getRandomArticle();
            articles.push(article);
        }
        return articles;
    }

    async getRandomArticle() {
        const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await response.json();
        return { title: data.title, description: data.description };
    }

    async getRelatedArticles(title) {
        const encodedTitle = encodeURIComponent(title);
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedTitle}&format=json&origin=*&srlimit=10`;
        
        const response = await fetch(url);
        const data = await response.json();
        return data.query.search.filter(item => item.title !== title);
    }

    isGoodOption(title) {
        const badPrefixes = ['List of', 'Index of', 'Template:', 'Category:', 'File:'];
        return !badPrefixes.some(prefix => title.startsWith(prefix)) && title.length < 50;
    }

    generateFakeOption(correctAnswer) {
        const prefixes = ['The', 'A', 'An'];
        const suffixes = ['Theory', 'Principle', 'Effect', 'Phenomenon', 'Paradox'];
        const adjectives = ['Great', 'Hidden', 'Mysterious', 'Unexpected', 'Quantum'];
        
        const words = correctAnswer.split(' ').filter(word => word.length > 3);
        if (words.length > 0) {
            const word = words[Math.floor(Math.random() * words.length)];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            return `${prefix} ${adjective} ${word} ${suffix}`;
        } else {
            return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
        }
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
        console.log("Showing options:", this.answerOptions); // Debug log
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
