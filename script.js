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
        card.innerText = gameMode === 'easy' ? word : '[CARD]'; // Show word for easy mode, hide for hard mode
        card.dataset.index = index;
        card.dataset.language = 'english';
        card.dataset.word = word;
        card.addEventListener('click', () => selectCard(card));
        englishContainer.appendChild(card);
    });

    displayKorean.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = gameMode === 'easy' ? word : '[CARD]'; // Show word for easy mode, hide for hard mode
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
        const studyDuration = getStudyDuration() * 1000; // Get the study duration in milliseconds
        setTimeout(() => {
            flipAllCardsBack();
        }, studyDuration);
    } else {
        isStudying = false; // Allow immediate interaction for easy mode
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

function startGame() {
    const chapter = document.getElementById('chapter').value;
    const selectedMode = document.querySelector('input[name="mode"]:checked'); // Get selected mode

    score = 0;
    attempt = 0;
    selectedCards = [];
    gameMode = selectedMode ? selectedMode.value : 'hard'; // Set the game mode, default to hard

    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('message').innerText = '';
    document.getElementById('reset-button').style.display = 'none';

    if (!chapter) {
        alert('Please select a chapter.');
        return;
    }

    loadWordPairsFromChapter(chapter);
}

function getStudyDuration() {
    const durationInput = document.getElementById('study-duration').value;
    const duration = parseInt(durationInput, 10);
    return isNaN(duration) || duration <= 0 ? 15 : duration; // Default to 15 seconds if input is invalid
}

function selectCard(card) {
    if (isStudying) return; // Prevent selecting cards during the study period
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
        // Change the appearance of the cards for a non-match
        if (gameMode === 'easy') {
            // Set a different style to indicate that the cards do not match
            firstCard.style.backgroundColor = '#f2a5a5'; // Example color for non-match indication
            secondCard.style.backgroundColor = '#f2a5a5';

            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Try again. 😞',
                confirmButtonText: 'OK'
            });

            document.getElementById('message').innerText = 'Try again!';

            // Allow cards to be clicked again after a short delay
            setTimeout(() => {
                firstCard.style.backgroundColor = ''; // Reset the background color
                secondCard.style.backgroundColor = '';
            }, 1000); // Delay before resetting the appearance
        } else {
            // Hard mode behavior
            setTimeout(() => {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Try again. 😞',
                    confirmButtonText: 'OK'
                });

                firstCard.classList.remove('revealed');
                firstCard.innerText = '[CARD]';
                secondCard.classList.remove('revealed');
                secondCard.innerText = '[CARD]';

                document.getElementById('message').innerText = 'Try again!';
            }, 1000);
        }
    }

    // Clear selected cards for the next round
    selectedCards = [];
    attempt += 1;

    if (attempt >= maxAttempts && document.querySelectorAll('.matched').length < wordPairs.length * 2) {
        document.getElementById('message').innerText = 'Game Over!';
        document.getElementById('reset-button').style.display = 'block';
    }
}

document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('reset-button').addEventListener('click', startGame);
document.getElementById('practice-button').addEventListener('click', showPracticeMode);
document.getElementById('refresh-button').addEventListener('click', () => {
    location.reload();
});

function showPracticeMode() {
    const practiceList = document.getElementById('practice-list');
    practiceList.innerHTML = '';
    practiceList.style.display = 'block';
    document.querySelector('.game-board').style.display = 'none';

    // List all word pairs for practice mode
    wordPairs.forEach(pair => {
        const practiceItem = document.createElement('div');
        practiceItem.className = 'practice-item';
        practiceItem.innerHTML = `<strong>${pair.english}</strong> - ${pair.korean}`;
        practiceItem.addEventListener('click', () => {
            playSound(pair.soundFile);
        });
        practiceList.appendChild(practiceItem);
    });
}
