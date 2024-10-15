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
                console.log("Extract:", article.extract);
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
                if (data.thumbnail && data.thumbnail.source && data.extract && data.extract.length > 50) {
                    return data;
                }
            } catch (error) {
                console.error('Error fetching random article:', error);
            }
        }
        throw new Error('Unable to find a suitable article with an image after multiple attempts');
    }

    async generateAnswerOptions() {
        try {
            const correctTitle = this.toTitleCase(this.cleanTitle(this.correctAnswer.title));
            let options = [correctTitle];
            const answerType = this.detectAnswerType(this.correctAnswer);
            const keywords = this.extractKeywords(this.correctAnswer.extract);
            
            // Get related articles from Wikipedia based on answer type
            const relatedArticles = await this.getRelatedArticles(keywords, answerType);
            
            // Add related articles to options
            for (let article of relatedArticles) {
                if (options.length < 4 && this.isDistinctOption(article, options)) {
                    options.push(this.toTitleCase(this.cleanTitle(article)));
                }
            }

            // If we still need more options, generate contextual fake ones
            while (options.length < 4) {
                const fakeOption = this.generateContextualFakeOption(this.correctAnswer, answerType, keywords);
                if (this.isDistinctOption(fakeOption, options)) {
                    options.push(this.toTitleCase(fakeOption));
                }
            }

            return this.shuffleArray(options);
        } catch (error) {
            console.error("Error generating options:", error);
            return this.generateFallbackOptions(this.correctAnswer.title);
        }
    }

    detectAnswerType(answer) {
        const title = answer.title.toLowerCase();
        const extract = answer.extract.toLowerCase();

        if (/ born | died |politician|actor|actress|singer|athlete|player|author|scientist/.test(extract)) {
            return 'person';
        } else if (/city|country|continent|river|mountain|ocean|sea|lake/.test(title) || /located in|capital of/.test(extract)) {
            return 'place';
        } else if (/in \d{4}|\d{4}–\d{4}|century|decade|era|period/.test(extract)) {
            return 'event';
        } else {
            return 'concept';
        }
    }

    extractKeywords(extract) {
        const words = extract.toLowerCase().split(/\W+/);
        const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but']);
        return words.filter(word => word.length > 3 && !stopWords.has(word)).slice(0, 5);
    }

    async getRelatedArticles(keywords, answerType) {
        let searchTerm = keywords.join(' ');
        if (answerType === 'person') {
            searchTerm += ' biography';
        } else if (answerType === 'place') {
            searchTerm += ' location';
        } else if (answerType === 'event') {
            searchTerm += ' history';
        }

        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*&srlimit=10`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.query.search
                .map(item => item.title)
                .filter(title => title !== this.correctAnswer.title);
        } catch (error) {
            console.error("Error fetching related articles:", error);
            return [];
        }
    }

    generateContextualFakeOption(correctAnswer, answerType, keywords) {
        if (answerType === 'person') {
            return this.generateFakePerson(correctAnswer, keywords);
        } else if (answerType === 'place') {
            return this.generateFakePlace(correctAnswer, keywords);
        } else if (answerType === 'event') {
            return this.generateFakeEvent(correctAnswer, keywords);
        } else {
            return this.generateFakeConcept(correctAnswer, keywords);
        }
    }

    generateFakePerson(correctAnswer, keywords) {
        const firstNames = ['John', 'Jane', 'Michael', 'Emma', 'David', 'Sarah', 'Robert', 'Linda'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const professions = ['politician', 'actor', 'scientist', 'author', 'athlete'];
        const profession = professions[Math.floor(Math.random() * professions.length)];
        return `${name}, ${profession}`;
    }

    generateFakePlace(correctAnswer, keywords) {
        const prefixes = ['North', 'South', 'East', 'West', 'New', 'Old', 'Upper', 'Lower'];
        const suffixes = ['ville', 'town', 'city', 'burg', 'land', 'shire'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const baseName = keywords[Math.floor(Math.random() * keywords.length)];
        return `${prefix} ${this.toTitleCase(baseName)}${suffix}`;
    }

    generateFakeEvent(correctAnswer, keywords) {
        const eventTypes = ['Battle of', 'Treaty of', 'Discovery of', 'Invention of', 'Revolution in'];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const baseName = keywords[Math.floor(Math.random() * keywords.length)];
        return `${eventType} ${this.toTitleCase(baseName)}`;
    }

    generateFakeConcept(correctAnswer, keywords) {
        const conceptPrefixes = ['Theory of', 'Principle of', 'Law of', 'Phenomenon of'];
        const prefix = conceptPrefixes[Math.floor(Math.random() * conceptPrefixes.length)];
        const baseName = keywords[Math.floor(Math.random() * keywords.length)];
        return `${prefix} ${this.toTitleCase(baseName)}`;
    }

    toTitleCase(str) {
        return str.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    isDistinctOption(newOption, existingOptions) {
        return !existingOptions.some(option => 
            this.calculateSimilarity(newOption, option) > 0.7
        );
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        const longerLength = longer.length;
        if (longerLength === 0) {
            return 1.0;
        }
        return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = new Array();
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0)
                    costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    cleanTitle(title) {
        // Remove leading special characters and spaces
        let cleanedTitle = title.replace(/^[-–—*.(),\s]+/, '');
        // Remove trailing parentheses and any spaces before them
        cleanedTitle = cleanedTitle.replace(/\s*\([^)]*\)\s*$/, '');
        return cleanedTitle.trim();
    }

    generateFallbackOptions(correctAnswer) {
        return [
            correctAnswer,
            this.generateContextualFakeOption(correctAnswer, 'concept', []),
            this.generateContextualFakeOption(correctAnswer, 'concept', []),
            this.generateContextualFakeOption(correctAnswer, 'concept', [])
        ].map(option => this.toTitleCase(option));
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
        const cleanedCorrectAnswer = this.toTitleCase(this.cleanTitle(this.correctAnswer.title));
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
