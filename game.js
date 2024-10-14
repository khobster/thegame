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

        this.getRandomArticleWithImage()
            .then(article => {
                this.correctAnswer = article;
                console.log("Correct answer:", article.title);
                console.log("Categories:", article.categories);
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

    async getRandomArticleWithImage(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
                const data = await response.json();
                if (data.thumbnail && data.thumbnail.source) {
                    const categories = await this.getArticleCategories(data.title);
                    if (categories.length > 0) {
                        return { ...data, categories };
                    }
                }
            } catch (error) {
                console.error('Error fetching random article:', error);
            }
        }
        throw new Error('Unable to find a suitable article with an image after multiple attempts');
    }

    async getArticleCategories(title) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=categories&titles=${encodeURIComponent(title)}&format=json&origin=*&cllimit=50`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const page = Object.values(data.query.pages)[0];
            return page.categories ? page.categories.map(cat => cat.title.replace('Category:', '')) : [];
        } catch (error) {
            console.error("Error fetching categories:", error);
            return [];
        }
    }

    async generateAnswerOptions() {
        try {
            const mainCategory = this.selectMainCategory(this.correctAnswer.categories);
            let options = [this.cleanTitle(this.correctAnswer.title)];

            while (options.length < 4) {
                const newOption = await this.getRandomArticleFromCategory(mainCategory);
                if (newOption && !options.includes(newOption) && this.isGoodOption(newOption)) {
                    options.push(newOption);
                }
            }

            return this.shuffleArray(options);
        } catch (error) {
            console.error("Error generating options:", error);
            return this.generateFallbackOptions(this.correctAnswer.title);
        }
    }

    selectMainCategory(categories) {
        const preferredCategories = ['birth', 'people', 'person', 'city', 'country', 'place', 'landmark', 'animal', 'plant', 'species'];
        for (let preferred of preferredCategories) {
            const match = categories.find(cat => cat.toLowerCase().includes(preferred));
            if (match) return match;
        }
        return categories[0]; // fallback to first category if no preferred category is found
    }

    async getRandomArticleFromCategory(category) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=20&format=json&origin=*`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const pages = data.query.categorymembers;
            if (pages.length > 0) {
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                return this.cleanTitle(randomPage.title);
            }
        } catch (error) {
            console.error("Error fetching article from category:", error);
        }
        return null;
    }

    cleanTitle(title) {
        // Remove leading special characters and spaces
        let cleanedTitle = title.replace(/^[-–—*.(),\s]+/, '');
        // Remove trailing parentheses and any spaces before them
        cleanedTitle = cleanedTitle.replace(/\s*\([^)]*\)\s*$/, '');
        return cleanedTitle.trim();
    }

    isGoodOption(title) {
        const cleanTitle = this.cleanTitle(title);
        const badPrefixes = ['List of', 'Index of', 'Template:', 'Category:', 'File:', 'Wikipedia'];
        return !badPrefixes.some(prefix => cleanTitle.startsWith(prefix)) && 
               cleanTitle.length < 50 && 
               cleanTitle.toLowerCase() !== 'wikipedia' &&
               !cleanTitle.includes('Wikipedia');
    }

    generateFakeOption(correctAnswer) {
        const words = correctAnswer.split(' ').filter(word => word.length > 3);
        if (words.length > 1) {
            const index1 = Math.floor(Math.random() * words.length);
            let index2 = Math.floor(Math.random() * words.length);
            while (index2 === index1) {
                index2 = Math.floor(Math.random() * words.length);
            }
            [words[index1], words[index2]] = [words[index2], words[index1]];
            return words.join(' ');
        } else {
            const fakeWords = ['The', 'A', 'An', 'Great', 'Hidden', 'Mysterious', 'Unexpected', 'Secret'];
            return fakeWords[Math.floor(Math.random() * fakeWords.length)] + ' ' + correctAnswer;
        }
    }

    generateFallbackOptions(correctAnswer) {
        return [
            correctAnswer,
            this.generateFakeOption(correctAnswer),
            this.generateFakeOption(correctAnswer),
            this.generateFakeOption(correctAnswer)
        ];
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
        console.log("Showing options:", this.answerOptions);
        this.answerOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-button';
            button.addEventListener('click', () => this.handleGuess(option));
            this.optionsContainer.appendChild(button);
        });
    }

    handleGuess(userGuess) {
        console.log("User guessed:", userGuess);
        const cleanedCorrectAnswer = this.cleanTitle(this.correctAnswer.title);
        console.log("Correct answer:", cleanedCorrectAnswer);
        const isCorrect = userGuess === cleanedCorrectAnswer;

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
