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
            if (gameMode === 'practice') {
                startPracticeMode();
            } else {
                createCards(); // Create cards with the selected word pairs for game mode
            }
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
    
    // Clear any existing cards
    englishContainer.innerHTML = '';
    koreanContainer.innerHTML = '';

    // Limit to 10 pairs for the game
    const gamePairs = wordPairs.slice(0, 10);

    // Extract Korean and English words and shuffle them
    displayKorean = gamePairs.map(pair => pair.korean);
    displayEnglish = gamePairs.map(pair => pair.english);
    shuffle(displayKorean);
    shuffle(displayEnglish);

    // Create English cards
    displayEnglish.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = word;
        card.dataset.index = index;
        card.dataset.language = 'english';
        card.dataset.word = word;
        card.addEventListener('click', () => selectCard(card));
        englishContainer.appendChild(card);
    });

    // Create Korean cards
    displayKorean.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = word;
        card.dataset.index = index;
        card.dataset.language = 'korean';
        card.dataset.word = word;

        // Get corresponding sound file
        let soundFile = gamePairs.find(pair => pair.korean === word).soundFile;
        if (!soundFile.endsWith('.mp3')) {
            soundFile += '.mp3';
        }
        card.dataset.soundFile = soundFile;
        card.addEventListener('click', () => selectCard(card));
        koreanContainer.appendChild(card);
    });

    // If in Hard mode, start the study period before the game begins
    if (gameMode === 'hard') {
        isStudying = true;
        const studyDuration = getStudyDuration();
        startCountdown(studyDuration);
        setTimeout(() => {
            flipAllCardsBack();
            isStudying = false;
        }, studyDuration * 1000);
    }
}

function flipAllCardsBack() {
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        card.classList.remove('revealed');
        card.innerText = '[CARD]';
    });
    isStudying = false;
}

function getStudyDuration() {
    const durationInput = document.getElementById('study-duration').value;
    let duration = parseInt(durationInput, 10);
    if (isNaN(duration) || duration < 1) {
        duration = 1;
    } else if (duration > 60) {
        duration = 60;
    }
    return duration;
}

function selectCard(card) {
    if (isStudying) return;
    if (selectedCards.length < 2 && !card.classList.contains('revealed')) {
        card.classList.add('revealed');
        if (gameMode === 'hard') {
            card.innerText = card.dataset.word;
        }
        selectedCards.push(card);
        if (card.dataset.language === 'korean') {
            playSound(card.dataset.soundFile);
        }
        if (selectedCards.length === 2) {
            setTimeout(checkMatch, 1000);
        }
    }
}

function playSound(soundFile) {
    const audioPath = `https://rsim89.github.io/korean_words/audiofiles/KORE121/ch6/${soundFile}`;
    const audio = new Audio(audioPath);
    audio.play().catch(error => {
        console.error('Error playing the audio file:', error);
        alert('Could not play the audio. Please ensure the file exists and is accessible.');
    });
}

function checkMatch() {
    const [firstCard, secondCard] = selectedCards;
    const firstWord = firstCard.dataset.word;
    const secondWord = secondCard.dataset.word;

    const match = wordPairs.some(pair =>
        (pair.korean === firstWord && pair.english === secondWord) ||
        (pair.korean === secondWord && pair.english === firstWord)
    );

    if (match) {
        score += 10;
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        document.getElementById('score').innerText = `Score: ${score}`;

        Swal.fire({
            icon: 'success',
            title: 'Correct!',
            text: `You are correct! 😊 The word pair '${firstWord}' and '${secondWord}' is a correct match!`,
            confirmButtonText: 'OK'
        });

        document.getElementById('message').innerText = 'Correct!';
    } else {
        setTimeout(() => {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Try again. 😞',
                confirmButtonText: 'OK'
            });

            if (gameMode === 'hard') {
                firstCard.classList.remove('revealed');
                firstCard.innerText = '[CARD]';
                secondCard.classList.remove('revealed');
                secondCard.innerText = '[CARD]';
            }

            if (gameMode === 'easy') {
                firstCard.classList.remove('revealed');
                firstCard.innerText = firstCard.dataset.word;
                secondCard.classList.remove('revealed');
                secondCard.innerText = secondCard.dataset.word;
            }

            document.getElementById('message').innerText = 'Try again!';
        }, 1000);
    }

    selectedCards = [];
    attempt += 1;

    if (attempt >= maxAttempts && document.querySelectorAll('.matched').length < wordPairs.length * 2) {
        document.getElementById('message').innerText = 'Game Over!';
        document.getElementById('reset-button').style.display = 'block';
    }
}

function startCountdown(duration) {
    let remainingTime = duration;
    const countdownElement = document.getElementById('countdown-timer');

    countdownElement.innerText = `Time left: ${remainingTime} sec`;
    countdownElement.style.display = 'block';

    const countdownInterval = setInterval(() => {
        remainingTime -= 1;
        countdownElement.innerText = `Time left: ${remainingTime} sec`;

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none';
        }
    }, 1000);
}


function startMatchingGame() {
    const chapter = document.getElementById('chapter').value;
    const selectedMode = document.querySelector('input[name="mode"]:checked');

    if (!selectedMode || !['easy', 'hard'].includes(selectedMode.value)) {
        alert('Please select a valid game mode (Easy or Hard).');
        return;
    }

    gameMode = selectedMode.value;
    score = 0;
    attempt = 0;
    selectedCards = [];
    isStudying = false;
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('message').innerText = '';
    document.getElementById('reset-button').style.display = 'none';

    if (!chapter) {
        alert('Please select a chapter.');
        return;
    }

    loadWordPairsFromChapter(chapter);
}

function startPracticeMode() {
    const practiceList = document.getElementById('practice-list');
    practiceList.innerHTML = '';
    practiceList.style.display = 'block';
    document.querySelector('.game-board').style.display = 'none';

    wordPairs.forEach(pair => {
        const practiceItem = document.createElement('div');
        practiceItem.className = 'practice-item';
        practiceItem.innerHTML = `<strong>${pair.english}</strong> <strong>${pair.korean}</strong>`;
        practiceItem.addEventListener('click', () => {
            playSound(pair.soundFile);
        });
        practiceList.appendChild(practiceItem);
    });
}


function adjustLayoutForMode() {
    const container = document.querySelector('.container');
    const gameBoard = document.querySelector('.game-board');
    const practiceList = document.getElementById('practice-list');

    if (gameMode === 'practice') {
        // Adjust layout for practice mode
        container.style.minHeight = '600px'; // Increase the minimum height for practice mode
        gameBoard.style.display = 'none'; // Hide the game board
        practiceList.style.display = 'block'; // Show the practice list
    } else {
        // Adjust layout for game mode
        container.style.minHeight = '400px'; // Set the minimum height for game mode
        gameBoard.style.display = 'flex'; // Show the game board
        practiceList.style.display = 'none'; // Hide the practice list
    }
}

document.getElementById('start-button').addEventListener('click', () => {
    // Fetch the latest mode and chapter
    const selectedMode = document.querySelector('input[name="mode"]:checked');
    const chapter = document.getElementById('chapter').value;

    // Validate the selected mode
    if (!selectedMode || !['easy', 'hard', 'practice'].includes(selectedMode.value)) {
        alert('Please select a valid game mode (Easy, Hard, or Practice).');
        return;
    }

    // Validate the selected chapter
    if (!chapter) {
        alert('Please select a chapter.');
        return;
    }

    // Update the gameMode with the selected mode value
    gameMode = selectedMode.value;

    // Reset the game state
    score = 0;
    attempt = 0;
    selectedCards = [];
    isStudying = false; // Reset study flag

    // Update UI elements
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('message').innerText = '';
    document.getElementById('reset-button').style.display = 'none';

    // Show the game board and hide the practice list
    document.querySelector('.game-board').style.display = 'block';
    document.getElementById('practice-list').style.display = 'none';

    // Start the appropriate mode based on the selection
    if (gameMode === 'practice') {
        startPracticeMode();
    } else {
        // Reload word pairs if the chapter or mode changed, to ensure a fresh start
        loadWordPairsFromChapter(chapter);
    }
    adjustLayoutForMode(); // Adjust the layout based on the selected mode
});

document.getElementById('reset-button').addEventListener('click', startMatchingGame);
document.getElementById('refresh-button').addEventListener('click', () => {
    location.reload();
});
