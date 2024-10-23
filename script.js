let wordPairs = [];
let score = 0;
let attempt = 0;
let maxAttempts = 15;
let selectedCards = [];
let displayKorean = [];
let displayEnglish = [];
let gameMode = 'easy'; // Default to easy mode
let isStudying = false; // Flag to track if the study period is active
let isMuted = false;
let flipTimeout; // Variable to hold the timeout ID for flipping the cards back
let countdownInterval; // Store the interval ID globally

const BASE_URL = 'https://rsim89.github.io/korean_learning_game/';

function googleImageSearch(query) {
    const googleImageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    window.open(googleImageSearchUrl, '_blank');
}

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

function flipAllCardsBack() {
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        card.classList.remove('revealed');
        card.innerText = '[HIDDEN]';
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

function resetCountdown() {
    clearInterval(countdownInterval); // Stop the current countdown
    const countdownElement = document.getElementById('countdown-timer');
    countdownElement.innerText = ''; // Clear the countdown display
    countdownElement.style.display = 'none'; // Hide the countdown

    // Reset study duration to the default or valid value
    const studyDuration = getStudyDuration();
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
            } else if (gameMode === 'picture') {
                PracticePicture(); // Call the PracticePicture function for the picture game mode
            } else {
                createCards(); // Create cards with the selected word pairs for other game modes
            }
        })
        .catch(error => {
            console.error('Error loading the file:', error);
            alert('Failed to load the selected chapter. Please make sure the file exists and is accessible.');
        });
}



function createCards() {
    // Get the selected mode at the start of the function
    const selectedMode = document.querySelector('input[name="mode"]:checked');
    if (!selectedMode) {
        console.error('No game mode selected');
        return;
    }
    gameMode = selectedMode.value; // Set the gameMode to the selected mode

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
        // Clear any existing countdown interval and timeout to avoid overlap
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (flipTimeout) {
            clearTimeout(flipTimeout);
            flipTimeout = null;
        }

        isStudying = true;
        const studyDuration = getStudyDuration();
        startCountdown(studyDuration);
    
        // Set a new timeout to flip the cards back after the study duration
        flipTimeout = setTimeout(() => {
            flipAllCardsBack(); // This function will be executed when flipTimeout finishes
        }, studyDuration * 1000);
    } else {
        // If in Easy mode, clear any existing timeout
        if (flipTimeout) {
            clearTimeout(flipTimeout);
            flipTimeout = null;
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
        document.getElementById('score').style.display = 'block'; // Show the score
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
                firstCard.innerText = '[HIDDEN]';
                secondCard.classList.remove('revealed');
                secondCard.innerText = '[HIDDEN]';
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
    Swal.fire({
        title: 'Get Ready!',
        text: 'Click OK to start the countdown.',
        position: 'top', // Position the popup at the top center
        toast: true, // Make it look like a non-blocking toast notification
        showConfirmButton: true, // Show the confirmation button
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup', // Add a custom class to the popup
            title: 'custom-swal-title', // Add a custom class to the title
            content: 'custom-swal-content', // Add a custom class to the content (text)
            confirmButton: 'custom-swal-button' // Add a custom class to the button
        }
    }).then(() => {
        // Start the countdown after the user clicks OK
        let timeRemaining = duration;

        Swal.fire({
            title: 'The Countdown is On!',
            html: `Keep going! You have <strong style="color: red;">${timeRemaining.toFixed(3)}</strong> seconds left before the cards will be hidden.`,
            position: 'top', // Position the popup at the top center
            toast: true, // Make it look like a non-blocking toast notification
            timer: duration * 1000,
            timerProgressBar: true,
            showConfirmButton: false, // Remove the confirmation button
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading(); // Show loading animation

                countdownInterval = setInterval(() => {
                    timeRemaining -= 0.01; // Decrease by 0.01 for 10ms precision

                    if (timeRemaining < 0) {
                        timeRemaining = 0;
                        clearInterval(countdownInterval);
                    }

                    Swal.getHtmlContainer().querySelector('strong').textContent = timeRemaining.toFixed(3);
                }, 10); // Update every 10 milliseconds for precision
            },
            willClose: () => {
                clearInterval(countdownInterval);
            }
        });
    });
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


function PracticePicture() {
    const practiceList = document.getElementById('practice-list');
    practiceList.innerHTML = '';
    practiceList.style.display = 'block';
    document.querySelector('.game-board').style.display = 'none';

    const course = document.getElementById('course').value;
    const chapter = document.getElementById('chapter').value;

    wordPairs.forEach(pair => {
        const practiceItem = document.createElement('div');
        practiceItem.className = 'practice-item';

        // Create a container for the Korean word
        const wordColumn = document.createElement('div');
        wordColumn.className = 'word-column';
        wordColumn.innerHTML = `<strong>${pair.korean}</strong>`;

        // Create a container for the input elements
        const inputColumn = document.createElement('div');
        inputColumn.className = 'input-column';

        // Create an input field for typing the English word
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.placeholder = 'Type English word';

        // Create an SVG icon for the "Check" action
        const checkIcon = document.createElement('img');
        checkIcon.src = `${BASE_URL}images/check.svg`; // Make sure the path to the SVG is correct
        checkIcon.classList.add('check-icon');

        // Add click event to the check icon to verify the answer
        checkIcon.addEventListener('click', () => {
            const isCorrect = inputField.value.trim().toLowerCase() === pair.english.toLowerCase();
            playFeedbackSound(isCorrect); // Play feedback sound based on correctness

            if (isCorrect) {
                Swal.fire({
                    icon: 'success',
                    title: 'Correct!',
                    text: `You are correct! 😊 The word pair '${pair.korean}' and '${pair.english}' is a correct match!`,
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Incorrect',
                    text: `Sorry, that's not correct. The correct answer is '${pair.english}'.`,
                    confirmButtonText: 'Try Again'
                });
            }
        });

        // Create a container for the icons (audio and search)
        const iconColumn = document.createElement('div');
        iconColumn.className = 'icon-column';

        // Create an SVG icon for the audio
        const audioIcon = document.createElement('img');
        audioIcon.src = `${BASE_URL}images/audio.svg`; // Make sure the path is correct
        audioIcon.classList.add('audio-icon');

        // Add click event to the audio icon to play the Korean word sound
        audioIcon.addEventListener('click', () => {
            playSound(course, chapter, pair.soundFile);
        });

        // Create an SVG icon for the Google Image search
        const searchIcon = document.createElement('img');
        searchIcon.src = `${BASE_URL}images/search.svg`; // Make sure the path is correct
        searchIcon.classList.add('search-icon');

        // Use the global googleImageSearch function
        searchIcon.addEventListener('click', () => {
            googleImageSearch(pair.korean);
        });

        // Append audio, search, and check icons to the icon column
        iconColumn.appendChild(audioIcon);
        iconColumn.appendChild(searchIcon);

        // Append input elements to the input column
        inputColumn.appendChild(inputField);
        inputColumn.appendChild(checkIcon);

        // Append the icon column, word column, and input column to the practice item
        practiceItem.appendChild(iconColumn);
        practiceItem.appendChild(wordColumn);
        practiceItem.appendChild(inputColumn);

        // Append the practice item to the list
        practiceList.appendChild(practiceItem);
    });
}



function adjustLayoutForMode() {
    const container = document.querySelector('.container');
    const gameBoard = document.querySelector('.game-board');
    const practiceList = document.getElementById('practice-list');

    if (gameMode === 'practice' || gameMode === 'picture') {
        // Adjust layout for both practice and picture modes
        container.style.minHeight = '600px'; // Increase the minimum height
        gameBoard.style.display = 'none'; // Hide the game board
        practiceList.style.display = 'block'; // Show the practice list
    } else {
        // Adjust layout for other game modes
        container.style.minHeight = '400px'; // Set the minimum height
        gameBoard.style.display = 'flex'; // Show the game board
        practiceList.style.display = 'none'; // Hide the practice list
    }
}


// Function to stop all currently playing sounds
function stopAllSounds() {
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0; // Reset audio to the beginning
    });
}


document.getElementById('start-button').addEventListener('click', () => {
    // Stop any ongoing audio playback
    stopAllSounds();

    // Close any active Swal pop-ups immediately
    Swal.close();

    // Clear any existing timeouts and intervals
    if (flipTimeout) {
        clearTimeout(flipTimeout);
        flipTimeout = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // Immediately stop the card flipping process if flipAllCardsBack() was in progress
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        card.classList.remove('revealed'); // Make sure all cards are unflipped
        card.innerText = '[HIDDEN]';
    });
    isStudying = false; // Reset the studying state

    // Fetch the latest mode and chapter
    const selectedMode = document.querySelector('input[name="mode"]:checked');
    const course = document.getElementById('course').value;
    const chapter = document.getElementById('chapter').value;
    const part = document.getElementById('part').value;

    // Validate course, chapter, and part
    if (!course || !chapter || !part) {
        alert('Please make sure to fill in all required fields: Course, Chapter, and Part.');
        return;
    }

    // Update the gameMode with the selected mode value
    gameMode = selectedMode.value;

    // Reset the game state
    score = 0;
    attempt = 0;
    selectedCards = [];
    isStudying = false; // Reset study flag

    // Reset countdown and study duration
    resetCountdown();
    const studyDuration = getStudyDuration();

    // Update UI elements
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('message').innerText = '';

    // Show the game board and hide the practice list
    document.querySelector('.game-board').style.display = 'block';
    document.getElementById('practice-list').style.display = 'none';

    // Load the word pairs for the selected chapter
    loadWordPairsFromChapter(course, chapter, part);

    adjustLayoutForMode(); // Adjust the layout based on the selected mode
});

document.getElementById('refresh-button').addEventListener('click', () => {
    location.reload();
});
