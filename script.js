let wordPairs = [];
let score = 0;
let attempt = 0;
let maxAttempts = 12;
let selectedCards = [];
let displayKorean = [];
let displayEnglish = [];

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
            wordPairs = wordPairs.slice(0, 10);
            createCards();
        })
        .catch(error => {
            console.error('Error loading the file:', error);
            alert('Failed to load the selected chapter. Please make sure the file exists and is accessible.');
        });
}

function createCards() {
    const englishContainer = document.getElementById('english-cards');
    const koreanContainer = document.getElementById('korean-cards');
    englishContainer.innerHTML = '';
    koreanContainer.innerHTML = '';

    displayKorean = wordPairs.map(pair => pair.korean);
    displayEnglish = wordPairs.map(pair => pair.english);
    shuffle(displayKorean);
    shuffle(displayEnglish);

    displayEnglish.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = '[CARD]';
        card.dataset.index = index;
        card.dataset.language = 'english';
        card.dataset.word = word;
        card.addEventListener('click', () => selectCard(card));
        englishContainer.appendChild(card);
    });

    displayKorean.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = '[CARD]';
        card.dataset.index = index;
        card.dataset.language = 'korean';
        card.dataset.word = word;

        // Ensure the soundFile includes the ".mp3" extension
        let soundFile = wordPairs.find(pair => pair.korean === word).soundFile;
        if (!soundFile.endsWith('.mp3')) {
            soundFile += '.mp3';
        }
        card.dataset.soundFile = soundFile;
        card.addEventListener('click', () => selectCard(card));
        koreanContainer.appendChild(card);
    });
}

function startGame() {
    const chapter = document.getElementById('chapter').value;
    score = 0;
    attempt = 0;
    selectedCards = [];

    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('message').innerText = '';
    document.getElementById('reset-button').style.display = 'none';

    if (!chapter) {
        alert('Please select a chapter.');
        return;
    }

    loadWordPairsFromChapter(chapter);
}

function selectCard(card) {
    if (selectedCards.length < 2 && !card.classList.contains('revealed')) {
        card.classList.add('revealed');
        card.innerText = card.dataset.word;
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
    // Ensure the soundFile ends with ".mp3"
    if (!soundFile.endsWith('.mp3')) {
        soundFile += '.mp3';
    }

    // Set the base URL for audio files
    const audioPath = `https://rsim89.github.io/korean_words/audiofiles/KORE121/ch6/${soundFile}`;

    // Create and play the audio
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

    // Check if the selected pair matches
    const match = wordPairs.some(pair =>
        (pair.korean === firstWord && pair.english === secondWord) ||
        (pair.korean === secondWord && pair.english === firstWord)
    );

    if (match) {
        score += 10;
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        document.getElementById('score').innerText = `Score: ${score}`;

        // Show a pop-up message for a correct match
        Swal.fire({
            icon: 'success',
            title: 'Correct!',
            text: `You are correct! 😊 The word pair '${firstWord}' and '${secondWord}' is a correct match!`,
            confirmButtonText: 'OK'
        });

        document.getElementById('message').innerText = 'Correct!';
        selectedCards = []; // Clear selected cards for the next round

        // Check if all pairs have been matched
        const matchedCards = document.querySelectorAll('.matched');
        if (matchedCards.length === wordPairs.length * 2) {
            // All cards matched, game over
            Swal.fire({
                icon: 'success',
                title: 'Congratulations!',
                text: 'You have matched all the pairs!',
                confirmButtonText: 'OK'
            });
            document.getElementById('message').innerText = 'You matched all pairs!';
            document.getElementById('reset-button').style.display = 'block';
        }
    } else {
        // If not a match, flip the cards back after a short delay
        setTimeout(() => {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Try again. 😞',
                confirmButtonText: 'OK'
            });

            // Flip the cards back to the original state
            firstCard.classList.remove('revealed');
            firstCard.innerText = '[CARD]';
            secondCard.classList.remove('revealed');
            secondCard.innerText = '[CARD]';
            document.getElementById('message').innerText = 'Try again!';
            
            selectedCards = []; // Clear selected cards for the next attempt
        }, 1000); // Delay to allow time for viewing the cards before they flip back
    }

    attempt += 1;

    if (attempt >= maxAttempts && document.querySelectorAll('.matched').length < wordPairs.length * 2) {
        document.getElementById('message').innerText = 'Game Over!';
        document.getElementById('reset-button').style.display = 'block';
    }
}


document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('reset-button').addEventListener('click', startGame);
document.getElementById('practice-button').addEventListener('click', showPracticeMode); // New Practice Button Event

function showPracticeMode() {
    const practiceList = document.getElementById('practice-list');
    practiceList.innerHTML = ''; // Clear any previous content
    practiceList.style.display = 'block'; // Show the practice list
    document.querySelector('.game-board').style.display = 'none'; // Hide the game board during practice

    // Display the word pairs in the practice list
    wordPairs.forEach(pair => {
        const practiceItem = document.createElement('div');
        practiceItem.className = 'practice-item';
        practiceItem.innerHTML = `<strong>${pair.english}</strong> - ${pair.korean}`;
        practiceItem.addEventListener('click', () => {
            alert(`Selected Pair: ${pair.english} - ${pair.korean}`);
        });
        practiceList.appendChild(practiceItem);
    });
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
            wordPairs = wordPairs.slice(0, 10);
            createCards();
        })
        .catch(error => {
            console.error('Error loading the file:', error);
            alert('Failed to load the selected chapter. Please make sure the file exists and is accessible.');
        });
}
