let wordPairs = [];
let score = 0;
let attempt = 0;
let maxAttempts = 15;
let selectedCards = [];
let displayKorean = [];
let displayEnglish = [];
let gameMode = 'hard'; // Default to hard mode
let isStudying = false; // Flag to track if the study period is active
let isMuted = false;
let countdownInterval; // Store the interval ID globally

const BASE_URL = 'https://rsim89.github.io/korean_words/';

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const muteButton = document.getElementById('mute-button');
    muteButton.src = isMuted ? 'images/mute.svg' : 'images/unmute.svg';
}

function playSound(course, chapter, soundFile) {
    const audioPath = `${BASE_URL}audiofiles/${course}/${chapter}/${soundFile}`;
    const audio = new Audio(audioPath);
    
    audio.play().catch(error => {
        console.error('Error playing the audio file:', error);
        alert('Could not play the audio. Please ensure the file exists and is accessible.');
    });
}

function playFeedbackSound(isCorrect) {
    if (isMuted) return; // Do not play sound if muted

    const soundFile = isCorrect ? 'correct.mp3' : 'incorrect.mp3';
    const audioPath = `${BASE_URL}audiofiles/feedback/${soundFile}`;
    const audio = new Audio(audioPath);

    audio.play().catch(error => {
        console.error('Error playing the feedback audio file:', error);
        alert('Could not play the feedback audio. Please ensure the file exists and is accessible.');
    });
}

function loadWordPairsFromChapter(course, chapter, part) {
    const filePath = `${BASE_URL}vocab/${course}_${chapter}_${part}.xlsx`;

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
                    let soundFile = row[2];
                    if (!soundFile.endsWith('.mp3')) {
                        soundFile += '.mp3';
                    }
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
    const durationInput = document.getElementById('study-duration');
    let duration = parseInt(durationInput.value, 10);

    // Set to a default duration if the input is invalid or out of range
    if (isNaN(duration) || duration < 1) {
        duration = 10; // Default to 10 seconds
    } else if (duration > 60) {
        duration = 60;
    }

    // Reset the input field to the determined duration
    durationInput.value = duration;
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
            const course = document.getElementById('course').value;
            const chapter = document.getElementById('chapter').value;
            playSound(course, chapter, card.dataset.soundFile);
        }

        if (selectedCards.length === 2) {
            setTimeout(checkMatch, 1000);
        }
    }
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
        score += 10; // Increment score by 10 for each match
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
        playFeedbackSound(true); // Play the correct feedback sound
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
            playFeedbackSound(false); // Play the incorrect feedback sound
        }, 1000);
    }

    selectedCards = [];
    attempt += 1;

    // Check if score has reached 100
    if (score >= 100) {
        Swal.fire({
            icon: 'success',
            title: 'Congratulations!',
            text: 'You scored 100 points! 🎉',
            confirmButtonText: 'Restart'
        }).then(() => {
            resetGame(); // Reset score, attempts, and restart the game
        });
        document.getElementById('message').innerText = 'Congratulations!';
        document.getElementById('reset-button').style.display = 'block';
    } else if (attempt >= maxAttempts) {
        // Game over condition if maximum attempts are reached
        Swal.fire({
            icon: 'warning',
            title: 'Game Over!',
            text: `You've reached the maximum attempts of ${maxAttempts}.`,
            confirmButtonText: 'Restart'
        }).then(() => {
            resetGame(); // Reset score, attempts, and restart the game
        });
        document.getElementById('message').innerText = 'Game Over!';
        document.getElementById('reset-button').style.display = 'block';
    }
}

function resetGame() {
    score = 0;
    attempt = 0;
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('message').innerText = '';
    
    // Retrieve course, chapter, and part values from the DOM
    const course = document.getElementById('course').value;
    const chapter = document.getElementById('chapter').value;
    const part = document.getElementById('part').value;
    
    // Load the word pairs for the selected chapter
    loadWordPairsFromChapter(course, chapter, part);
    adjustLayoutForMode(); // Adjust the layout based on the selected mode
}


function startCountdown(duration) {
    if (gameMode !== 'hard') return; // Only show the countdown for hard mode

    let remainingTime = duration;
    const countdownElement = document.getElementById('countdown-timer');

    // Reset and update the countdown display
    countdownElement.innerText = `You have ${remainingTime} seconds before the words are hidden.`;
    countdownElement.style.display = 'block';

    // Clear any existing countdown interval to avoid overlap
    clearInterval(countdownInterval);

    // Start a new countdown
    countdownInterval = setInterval(() => {
        remainingTime -= 1;
        countdownElement.innerText = `You have ${remainingTime} seconds before the words are hidden.`;

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none'; // Hide the countdown when time is up
        }
    }, 1000);
}

function startMatchingGame() {
    const course = document.getElementById('course').value;
    const chapter = document.getElementById('chapter').value;
    const part = document.getElementById('part').value;
    const selectedMode = document.querySelector('input[name="mode"]:checked');
   
    document.querySelector('.game-board').style.display = 'block';
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

    // Hide the countdown if not in hard mode
    const countdownElement = document.getElementById('countdown-timer');
    countdownElement.style.display = gameMode === 'hard' ? 'block' : 'none';

    loadWordPairsFromChapter(course, chapter, part);
}

function startPracticeMode() {
    const practiceList = document.getElementById('practice-list');
    practiceList.innerHTML = '';
    practiceList.style.display = 'block';
    document.querySelector('.game-board').style.display = 'none';

    const course = document.getElementById('course').value;
    const chapter = document.getElementById('chapter').value;

    wordPairs.forEach(pair => {
        const practiceItem = document.createElement('div');
        practiceItem.className = 'practice-item';
        practiceItem.innerHTML = `<strong>${pair.english}</strong> <strong>${pair.korean}</strong>`;
        practiceItem.addEventListener('click', () => {
            playSound(course, chapter, pair.soundFile);
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
    const course = document.getElementById('course').value;
    const chapter = document.getElementById('chapter').value;
    const part = document.getElementById('part').value;

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

    loadWordPairsFromChapter(course, chapter, part);
    
    adjustLayoutForMode(); // Adjust the layout based on the selected mode
});

document.getElementById('reset-button').addEventListener('click', loadWordPairsFromChapter(course, chapter, part));
document.getElementById('refresh-button').addEventListener('click', () => {
    location.reload();
});
