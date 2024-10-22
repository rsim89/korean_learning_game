let wordPairs = [];
let score = 0;
let attempt = 0;
let maxAttempts = 12;
let selectedCards = [];
let displayKorean = [];
let displayEnglish = [];
let gameMode = 'hard'; // Default to hard mode
let isStudying = false; // Flag to track if the study period is active

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function loadWordPairsFromChapter(chapter) {
    const filePath = `https://rsim89.github.io/korean_words/vocab/${chapter}.xlsx`;

    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            wordPairs = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length >= 3) {
                    const korean = row[0];
                    const english = row[1];
                    const soundFile = row[2];
                    wordPairs.push({ korean, english, soundFile });
                }
            }

            shuffle(wordPairs);
            createCards(); // Create cards with the selected word pairs
        })
        .catch(error => {
            console.error('Error loading the file:', error);
            alert('Failed to load the selected chapter. Please make sure the file exists and is accessible.');
        });
}

function createCards() {
    const englishContainer = document.getElementById('english-cards');
    const koreanContainer = document.getElementById('korean-cards');
    if (!englishContainer || !koreanContainer) {
        console.error('Card containers not found');
        return;
    }
    englishContainer.innerHTML = '';
    koreanContainer.innerHTML = '';

    // Limit to 10 pairs for the game
    const gamePairs = wordPairs.slice(0, 10);
    
    displayKorean = gamePairs.map(pair => pair.korean);
    displayEnglish = gamePairs.map(pair => pair.english);
    shuffle(displayKorean);
    shuffle(displayEnglish);

    displayEnglish.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = word; // Show the actual word initially
        card.dataset.index = index;
        card.dataset.language = 'english';
        card.dataset.word = word;
        card.addEventListener('click', () => selectCard(card));
        englishContainer.appendChild(card);
    });

    displayKorean.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = word; // Show the actual word initially
        card.dataset.index = index;
        card.dataset.language = 'korean';
        card.dataset.word = word;

        let soundFile = gamePairs.find(pair => pair.korean === word).soundFile;
        if (!soundFile.endsWith('.mp3')) {
            soundFile += '.mp3';
        }
        card.dataset.soundFile = soundFile;
        card.addEventListener('click', () => selectCard(card));
        koreanContainer.appendChild(card);
    });

    if (gameMode === 'hard') {
        isStudying = true; // Prevent interaction during the study period
        const studyDuration = getStudyDuration(); // Get the study duration in seconds
        startCountdown(studyDuration); // Start the countdown
        setTimeout(() => {
            flipAllCardsBack(); // Flip cards back after the study period
            isStudying = false; // Allow interaction after the study period
        }, studyDuration * 1000);
    }
}

function flipAllCardsBack() {
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        card.classList.remove('revealed');
        card.innerText = '[CARD]'; // Flip the card back to the original state
    });
    isStudying = false; // Allow interaction after flipping the cards back
}

function startMatchingGame() {
    const chapter = document.getElementById('chapter').value;
    const selectedMode = document.querySelector('input[name="mode"]:checked'); // Get selected mode

    if (!selectedMode || selectedMode.value === 'practice') {
        alert('Please select a valid game mode (Easy/Hard).');
        return;
    }

    // Get the selected mode value
    gameMode = selectedMode.value;

    // Set different parameters based on the selected mode
    if (gameMode === 'easy') {
        maxAttempts = 15; // More attempts in easy mode
        cardRevealTime = 2000; // Cards stay revealed for 2 seconds in easy mode
    } else if (gameMode === 'hard') {
        maxAttempts = 12; // Fewer attempts in hard mode
        cardRevealTime = 1000; // Cards stay revealed for 1 second in hard mode
    }

    // Reset game state
    score = 0;
    attempt = 0;
    selectedCards = [];
    isStudying = false; // Reset study flag
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('message').innerText = '';
    document.getElementById('reset-button').style.display = 'none';
    document.querySelector('.game-board').style.display = 'flex'; // Show the game board
    document.getElementById('practice-list').style.display = 'none'; // Hide practice list

    if (!chapter) {
        alert('Please select a chapter.');
        return;
    }

    // Reload word pairs if necessary and start the game
    if (wordPairs.length === 0) {
        loadWordPairsFromChapter(chapter);
    } else {
        createCards(); // Recreate the cards without reloading the chapter
    }
}

function startPracticeMode() {
    const selectedMode = document.querySelector('input[name="mode"]:checked').value;

    // Double-check if the selected mode is "practice"
    if (selectedMode !== 'practice') {
        alert('Practice mode is not selected. Please select "Practice" mode to start.');
        return;
    }

    const chapter = document.getElementById('chapter').value;

    if (!chapter) {
        alert('Please select a chapter.');
        return;
    }

    if (wordPairs.length === 0) {
        // Load word pairs if they haven't been loaded yet
        loadWordPairsFromChapter(chapter);
    }

    const practiceList = document.getElementById('practice-list');
    practiceList.innerHTML = '';
    practiceList.style.display = 'block'; // Show the practice list
    document.querySelector('.game-board').style.display = 'none'; // Hide the game board

    // List all word pairs for practice mode
    wordPairs.forEach(pair => {
        const practiceItem = document.createElement('div');
        practiceItem.className = 'practice-item';
        practiceItem.innerHTML = `<strong>${pair.english}</strong>  <strong>${pair.korean}</strong>`;
        practiceItem.addEventListener('click', () => {
            playSound(pair.soundFile);
        });
        practiceList.appendChild(practiceItem);
    });
}

function startCountdown(duration) {
    let remainingTime = duration;
    const countdownElement = document.getElementById('countdown-timer');

    countdownElement.innerText = `Time left: ${remainingTime} sec`;
    countdownElement.style.display = 'block'; // Make sure the timer is visible

    const countdownInterval = setInterval(() => {
        remainingTime -= 1;
        countdownElement.innerText = `Time left: ${remainingTime} sec`;

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none'; // Hide the timer when done
        }
    }, 1000);
}

document.getElementById('start-button').addEventListener('click', () => {
    const selectedMode = document.querySelector('input[name="mode"]:checked').value;
    if (selectedMode === 'practice') {
        startPracticeMode(); // Start the practice mode
    } else {
        startMatchingGame(); // Start the easy or hard mode
    }
});

document.getElementById('reset-button').addEventListener('click', startMatchingGame);
document.getElementById('refresh-button').addEventListener('click', () => {
    location.reload();
});
