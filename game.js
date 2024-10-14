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

    async getRelatedArticles(extract, count = 5) {
        const words = extract.split(/\s+/).filter(word => word.length > 4);
        const searchTerm = words.slice(0, 3).join(' ');
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*&srlimit=${count + 1}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.query.search
                .map(item => item.title)
                .filter(title => title !== this.correctAnswer.title)
                .slice(0, count);
        } catch (error) {
            console.error("Error fetching related articles:", error);
            return [];
        }
    }

    async generateAnswerOptions() {
        try {
            let options = [this.cleanTitle(this.correctAnswer.title)];
            const relatedArticles = await this.getRelatedArticles(this.correctAnswer.extract);
            
            // Add related articles, ensuring they're sufficiently different
            for (let article of relatedArticles) {
                const cleanedArticle = this.cleanTitle(article);
                if (this.isDistinctOption(cleanedArticle, options)) {
                    options.push(cleanedArticle);
                }
                if (options.length >= 4) break;
            }

            // If we still need more options, generate fake ones
            while (options.length < 4) {
                const fakeOption = this.generateFakeOption(this.correctAnswer.title);
                if (this.isDistinctOption(fakeOption, options)) {
                    options.push(fakeOption);
                }
            }

            return this.shuffleArray(options);
        } catch (error) {
            console.error("Error generating options:", error);
            return this.generateFallbackOptions(this.correctAnswer.title);
        }
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

    isGoodOption(title) {
        const cleanTitle = this.cleanTitle(title);
        const badPrefixes = ['List of', 'Index of', 'Template:', 'Category:', 'File:', 'Wikipedia'];
        return !badPrefixes.some(prefix => cleanTitle.startsWith(prefix)) && 
               cleanTitle.length > 3 &&
               cleanTitle.length < 50 && 
               cleanTitle.toLowerCase() !== 'wikipedia' &&
               !cleanTitle.includes('Wikipedia') &&
               !/^\d+$/.test(cleanTitle); // Exclude options that are just numbers
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
