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
                    const category = await this.determineCategory(data.title);
                    if (category !== 'unknown') {
                        return { ...data, category };
                    }
                }
            } catch (error) {
                console.error('Error fetching random article:', error);
            }
        }
        throw new Error('Unable to find a suitable article with an image after multiple attempts');
    }

    async determineCategory(title) {
        try {
            const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=categories&titles=${encodeURIComponent(title)}&format=json&origin=*`);
            const data = await response.json();
            const page = Object.values(data.query.pages)[0];
            const categories = page.categories.map(cat => cat.title.replace('Category:', ''));
            
            if (categories.some(cat => cat.includes('Living_people') || cat.includes('births'))) {
                return 'person';
            } else if (categories.some(cat => cat.includes('Cities_') || cat.includes('Countries_') || cat.includes('Places_'))) {
                return 'place';
            } else if (categories.some(cat => cat.includes('Objects_') || cat.includes('Products_'))) {
                return 'object';
            } else if (categories.some(cat => cat.includes('Concepts_') || cat.includes('Theories_'))) {
                return 'concept';
            }
            return 'unknown';
        } catch (error) {
            console.error("Error determining category:", error);
            return 'unknown';
        }
    }

    async generateAnswerOptions() {
        try {
            const category = this.correctAnswer.category;
            let options = [this.correctAnswer.title];

            while (options.length < 4) {
                const newOption = await this.getRandomArticleOfCategory(category);
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

    async getRandomArticleOfCategory(category) {
        const categoryMap = {
            'person': 'Living_people',
            'place': 'Cities_in_the_world',
            'object': 'Objects',
            'concept': 'Concepts'
        };
        const categoryToSearch = categoryMap[category] || 'Miscellaneous';

        const url = `https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*&rncategory=${categoryToSearch}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.query.random[0].title;
        } catch (error) {
            console.error("Error generating option of category:", error);
            return null;
        }
    }

    isGoodOption(title) {
        const badPrefixes = ['List of', 'Index of', 'Template:', 'Category:', 'File:', 'Wikipedia'];
        return !badPrefixes.some(prefix => title.startsWith(prefix)) && 
               title.length < 50 && 
               title.toLowerCase() !== 'wikipedia' &&
               !title.includes('Wikipedia');
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
        console.log("Correct answer:", this.correctAnswer.title);
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
