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
                if (data.thumbnail && data.thumbnail.source && data.extract && data.extract.length > 50 && !data.title.startsWith("List of")) {
                    return data;
                }
            } catch (error) {
                console.error('Error fetching random article:', error);
            }
        }
        throw new Error('Unable to find a suitable article with an image after multiple attempts');
    }

    detectAnswerType(answer) {
        const title = answer.title.toLowerCase();
        const extract = answer.extract.toLowerCase();

        if (/ born | died |politician|actor|actress|singer|athlete|player|author|scientist/.test(extract)) {
            return 'person';
        } else if (/city|town|village/.test(title) || /is a city|is a town|is a village/.test(extract)) {
            return 'city';
        } else if (/country|nation|state/.test(title) || /is a country|is a nation|is a state/.test(extract)) {
            return 'country';
        } else if (/animal|species|genus/.test(title) || /is an animal|is a species/.test(extract)) {
            return 'animal';
        } else if (/film|movie/.test(title) || /is a film|is a movie/.test(extract)) {
            return 'movie';
        } else if (/book|novel/.test(title) || /is a book|is a novel/.test(extract)) {
            return 'book';
        } else if (/in \d{4}|\d{4}–\d{4}|century|decade|era|period/.test(extract)) {
            return 'event';
        } else {
            return 'concept';
        }
    }

    async generateAnswerOptions() {
        try {
            const correctTitle = this.toTitleCase(this.cleanTitle(this.correctAnswer.title));
            let options = [correctTitle];
            const answerType = this.detectAnswerType(this.correctAnswer);
            
            const relatedItems = await this.getRelatedItems(this.correctAnswer.title, answerType);
            
            // Add related items to options
            for (let item of relatedItems) {
                if (options.length < 4 && this.isDistinctOption(item, options)) {
                    options.push(this.toTitleCase(this.cleanTitle(item)));
                }
                if (options.length >= 4) break;
            }

            // If we still need more options, generate contextual fake ones
            while (options.length < 4) {
                const fakeOption = this.generateContextualFakeOption(this.correctAnswer, answerType);
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

    async getRelatedItems(title, answerType) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=categories&titles=${encodeURIComponent(title)}&format=json&origin=*&cllimit=50`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            const page = Object.values(data.query.pages)[0];
            
            if (page.categories) {
                const relevantCategories = this.getRelevantCategories(page.categories, answerType);

                if (relevantCategories.length > 0) {
                    const itemsInCategory = await this.getItemsInCategory(relevantCategories[0]);
                    return itemsInCategory.filter(item => item !== title);
                }
            }
            
            return [];
        } catch (error) {
            console.error("Error fetching related items:", error);
            return [];
        }
    }

    getRelevantCategories(categories, answerType) {
        const categoryKeywords = {
            'person': ['people', 'persons', 'century', 'births', 'deaths'],
            'city': ['cities', 'towns', 'municipalities'],
            'country': ['countries', 'nations', 'states'],
            'animal': ['animals', 'species', 'fauna'],
            'movie': ['films', 'movies'],
            'book': ['books', 'novels', 'publications'],
            'event': ['events', 'history', 'incidents'],
            'concept': ['concepts', 'theories', 'ideas']
        };

        const keywords = categoryKeywords[answerType] || categoryKeywords.concept;
        return categories
            .map(cat => cat.title)
            .filter(cat => keywords.some(keyword => cat.toLowerCase().includes(keyword)));
    }

    async getItemsInCategory(category) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=50&format=json&origin=*`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.query.categorymembers.map(member => member.title);
        } catch (error) {
            console.error("Error fetching items in category:", error);
            return [];
        }
    }

    generateContextualFakeOption(correctAnswer, answerType) {
        switch (answerType) {
            case 'person':
                return this.generateFakePerson(correctAnswer.title);
            case 'city':
                return this.generateFakeCity(correctAnswer.title);
            case 'country':
                return this.generateFakeCountry(correctAnswer.title);
            case 'animal':
                return this.generateFakeAnimal(correctAnswer.title);
            case 'movie':
                return this.generateFakeMovie(correctAnswer.title);
            case 'book':
                return this.generateFakeBook(correctAnswer.title);
            case 'event':
                return this.generateFakeEvent(correctAnswer.title);
            default:
                return this.generateFakeConcept(correctAnswer.title);
        }
    }

    generateFakePerson(realName) {
        const nameParts = realName.split(' ');
        const firstNames = ['John', 'Jane', 'Michael', 'Emma', 'David', 'Sarah', 'Robert', 'Linda'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        
        if (nameParts.length > 1) {
            // Replace either first name or last name
            if (Math.random() < 0.5) {
                nameParts[0] = firstNames[Math.floor(Math.random() * firstNames.length)];
            } else {
                nameParts[nameParts.length - 1] = lastNames[Math.floor(Math.random() * lastNames.length)];
            }
        } else {
            // If it's a single name, add a random first or last name
            if (Math.random() < 0.5) {
                nameParts.unshift(firstNames[Math.floor(Math.random() * firstNames.length)]);
            } else {
                nameParts.push(lastNames[Math.floor(Math.random() * lastNames.length)]);
            }
        }
        
        return nameParts.join(' ');
    }

    generateFakeCity(realCity) {
        const prefixes = ['New', 'Old', 'North', 'South', 'East', 'West'];
        const suffixes = ['ville', 'town', 'burg', 'port', 'field', 'land'];
        const parts = realCity.split(' ');
        if (Math.random() < 0.5) {
            parts.unshift(prefixes[Math.floor(Math.random() * prefixes.length)]);
        } else {
            parts.push(suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return parts.join(' ');
    }

    generateFakeCountry(realCountry) {
        const prefixes = ['New', 'North', 'South', 'East', 'West'];
        const suffixes = ['land', 'stan', 'ia', 'istan'];
        const parts = realCountry.split(' ');
        if (Math.random() < 0.5) {
            parts.unshift(prefixes[Math.floor(Math.random() * prefixes.length)]);
        } else {
            parts.push(suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return parts.join(' ');
    }

    generateFakeAnimal(realAnimal) {
        const prefixes = ['Giant', 'Dwarf', 'Spotted', 'Striped', 'Red', 'Blue'];
        const suffixes = ['wolf', 'bear', 'lion', 'tiger', 'fox', 'whale'];
        const parts = realAnimal.split(' ');
        if (Math.random() < 0.5) {
            parts.unshift(prefixes[Math.floor(Math.random() * prefixes.length)]);
        } else {
            parts[parts.length - 1] = suffixes[Math.floor(Math.random() * suffixes.length)];
        }
        return parts.join(' ');
    }

    generateFakeMovie(realMovie) {
        const prefixes = ['The', 'A', 'Return of', 'Rise of', 'Fall of'];
        const suffixes = ['Chronicles', 'Adventures', 'Legacy', 'Revenge', 'Destiny'];
        const parts = realMovie.split(' ');
        if (Math.random() < 0.5) {
            parts.unshift(prefixes[Math.floor(Math.random() * prefixes.length)]);
        } else {
            parts.push(suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return parts.join(' ');
    }

    generateFakeBook(realBook) {
        const prefixes = ['The', 'A', 'Secret of', 'Mystery of', 'Tale of'];
        const suffixes = ['Chronicles', 'Saga', 'Trilogy', 'Series', 'Opus'];
        const parts = realBook.split(' ');
        if (Math.random() < 0.5) {
            parts.unshift(prefixes[Math.floor(Math.random() * prefixes.length)]);
        } else {
            parts.push(suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return parts.join(' ');
    }

    generateFakeEvent(realEvent) {
        const prefixes = ['Great', 'Second', 'New', 'Modern'];
        const suffixes = ['Revolution', 'War', 'Reformation', 'Renaissance', 'Uprising'];
        const parts = realEvent.split(' ');
        if (Math.random() < 0.5) {
            parts.unshift(prefixes[Math.floor(Math.random() * prefixes.length)]);
        } else {
            parts.push(suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return parts.join(' ');
    }

    generateFakeConcept(realConcept) {
        const prefixes = ['Advanced', 'Theoretical', 'Applied', 'Fundamental'];
        const suffixes = ['Theory', 'Principle', 'Paradigm', 'Hypothesis'];
        const parts = realConcept.split(' ');
        if (Math.random() < 0.5) {
            parts.unshift(prefixes[Math.floor(Math.random() * prefixes.length)]);
        } else {
            parts.push(suffixes[Math.floor(Math.random() * suffixes.length)]);
        }
        return parts.join(' ');
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
            this.generateContextualFakeOption(correctAnswer, 'concept'),
            this.generateContextualFakeOption(correctAnswer, 'concept'),
            this.generateContextualFakeOption(correctAnswer, 'concept')
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
