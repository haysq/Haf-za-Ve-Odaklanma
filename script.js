const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameCanvas = document.getElementById('gameCanvas');
const scoreElement = document.getElementById('score');
const targetTextElement = document.getElementById('targetText');
const inputText = document.getElementById('inputText');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const retryButton = document.getElementById('retryButton');
const menuButton = document.getElementById('menuButton');
const modeSelection = document.querySelectorAll('input[name="mode"]');
const customMode = document.getElementById('customMode');
const tongueTwisterMode = document.getElementById('tongueTwisterMode');
const totalScoreElement = document.getElementById('totalScoreValue');
const highScoreElement = document.getElementById('highScoreValue');
const completedTwistersElement = document.getElementById('completedTwistersValue');

let player = { x: canvas.width / 2, y: canvas.height - 30, radius: 20, angle: Math.PI }; // Yarım daire için PI (180 derece)
let letters = [];
let score = 0;
let isGameRunning = false;
let fallSpeed = 2;
let spawnInterval = 1500; // Daha hızlı harf düşmesi için aralığı azalttım
let lastSpawnTime = 0;
let targetText = '';
let collectedLetters = new Set(); // Toplanan harfleri takip et
const turkishAlphabet = 'abcçdefgğhıijklmnoöprsştuüvyz'; // Türkçe alfabesi

// Puanları ve tekerleme tamamlama sayısını localStorage'dan yükle
let totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let completedTwisters = parseInt(localStorage.getItem('completedTwisters')) || 0;
totalScoreElement.textContent = totalScore;
highScoreElement.textContent = highScore;
completedTwistersElement.textContent = completedTwisters;

// Ekran boyutuna göre canvas boyutunu ayarla (dikey mod)
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.9; // Ekran genişliğinin %90'ı
    canvas.height = window.innerHeight * 0.9; // Ekran yüksekliğinin %90'ı (dikey mod için)
    player.x = canvas.width / 2; // Yuvarlağı yeniden ortala
    player.y = canvas.height - 30; // Alt kısımda tut
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Başlangıçta boyut ayarla

modeSelection.forEach(input => {
    input.addEventListener('change', () => {
        if (input.value === 'custom') {
            customMode.style.display = 'block';
            tongueTwisterMode.style.display = 'none';
        } else {
            customMode.style.display = 'none';
            tongueTwisterMode.style.display = 'block';
        }
    });
});

let currentMode = 'custom';
let currentText = '';

function startGame() {
    let text = '';
    currentMode = document.querySelector('input[name="mode"]:checked').value;
    
    if (currentMode === 'custom') {
        text = inputText.value.trim();
        if (text.length === 0) {
            alert('Lütfen bir metin girin!');
            return;
        }
    } else {
        const selectedTwister = document.getElementById('tongueTwisterSelect').value;
        if (!selectedTwister) {
            alert('Lütfen bir tekerleme seçin!');
            return;
        }
        text = selectedTwister;
    }

    currentText = text;
    targetText = text.toLowerCase();
    collectedLetters.clear();
    score = 0;
    letters = [];
    fallSpeed = 2;
    spawnInterval = 1500;
    isGameRunning = true;
    startScreen.style.display = 'none';
    gameCanvas.style.display = 'block';
    targetTextElement.style.display = 'block';
    targetTextElement.textContent = `Hedef Metin: ${targetText} (Kalan: ${targetText.length - collectedLetters.size})`;
    updateScore();
    gameLoop();
}

startButton.addEventListener('click', startGame);

function spawnLetter() {
    if (targetText.length === collectedLetters.size) return; // Tüm harfler toplandığında durdur

    // Aynı anda düşen harf sayısını 3 katına çıkar (27 harf)
    for (let i = 0; i < 27; i++) { // Önceki 9 harf yerine 27 harf düşecek
        // %80 olasılıkla hedef metinden, %20 olasılıkla rastgele harf (daha fazla hedef harf düşmesi için)
        if (Math.random() < 0.8) {
            const availableLetters = targetText.split('').filter(letter => !collectedLetters.has(letter));
            if (availableLetters.length === 0) continue;
            const letter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
            const x = Math.random() * (canvas.width - 20) + 10;
            // Aynı harfin düşme olasılığını artır (tekrar düşebilir)
            if (Math.random() < 0.6) { // %60 olasılıkla aynı harfi tekrar düşür
                letters.push({ x, y: 0, text: letter, color: getRandomGrayColor(), isTarget: true });
            }
        } else {
            const wrongLetter = turkishAlphabet[Math.floor(Math.random() * turkishAlphabet.length)];
            if (!targetText.includes(wrongLetter)) { // Hedef metinde olmayan bir harf seç
                const x = Math.random() * (canvas.width - 20) + 10;
                letters.push({ x, y: 0, text: wrongLetter, color: getRandomGrayColor(), isTarget: false });
            } else {
                continue; // Tekrar dene (başka bir yanlış harf bul)
            }
        }
    }
}

function getRandomGrayColor() {
    const grayValue = Math.floor(Math.random() * 100) + 50; // Siyah tonları (50-150 arası gri)
    return `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
}

function update() {
    if (!isGameRunning) return;

    // Harfleri düşür ve animasyon ekle
    letters.forEach((letter, index) => {
        letter.y += fallSpeed;
        if (letter.y > canvas.height) {
            letters.splice(index, 1);
        }
    });

    // Yeni harf spawn et
    const now = Date.now();
    if (now - lastSpawnTime > spawnInterval) {
        spawnLetter();
        lastSpawnTime = now;
    }

    // Hız artışı (her 20 saniyede %15, daha heyecanlı için)
    if (Date.now() % 20000 < 16) {
        fallSpeed *= 1.15;
        spawnInterval *= 0.85;
    }

    // Çarpışma kontrolü (hassasiyeti artırdım)
    letters.forEach((letter, index) => {
        const dx = player.x - letter.x;
        const dy = player.y - letter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + 15) { // Çarpışma alanını biraz genişlettim
            if (letter.isTarget && targetText.includes(letter.text)) {
                collectedLetters.add(letter.text);
                score += 10;
                letters.splice(index, 1);
                updateScore();
                targetTextElement.textContent = `Hedef Metin: ${targetText} (Kalan: ${targetText.length - collectedLetters.size})`;
                if (collectedLetters.size === targetText.length) {
                    winGame();
                }
            } else {
                gameOver();
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Yarım daireyi çiz (alt kısmı düz, yukarıya doğru kavisli)
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI, true); // Yarım daire (180 derece, yukarı bakar)
    ctx.fillStyle = '#3498db'; // Daha modern mavi tonu
    ctx.fill();
    ctx.closePath();

    // Harfleri çiz ve animasyon ekle
    letters.forEach(letter => {
        ctx.fillStyle = letter.color;
        ctx.font = '24px "Poppins", sans-serif'; // Daha modern font
        ctx.fillText(letter.text, letter.x, letter.y);
        // Hafif sallanma animasyonu
        letter.x += Math.sin(Date.now() * 0.005) * 2;
    });
}

function gameLoop() {
    if (!isGameRunning) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function updateScore() {
    scoreElement.textContent = `Toplanan Harfler: ${collectedLetters.size} / ${targetText.length}`;
}

function gameOver() {
    isGameRunning = false;
    gameOverScreen.style.display = 'flex';
    finalScoreElement.textContent = score;
    // En yüksek tek oyun puanını güncelle ve sakla
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
    // Toplam puanı güncelle ve sakla
    totalScore += score;
    localStorage.setItem('totalScore', totalScore);
    totalScoreElement.textContent = totalScore;
}

function winGame() {
    isGameRunning = false;
    if (currentMode === 'tongueTwister') {
        completedTwisters++;
        localStorage.setItem('completedTwisters', completedTwisters);
        completedTwistersElement.textContent = completedTwisters;
    }
    alert(`Tebrikler! Metni tamamladın! Puan: ${score}`);
    // En yüksek tek oyun puanını güncelle ve sakla
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
    // Toplam puanı güncelle ve sakla
    totalScore += score;
    localStorage.setItem('totalScore', totalScore);
    totalScoreElement.textContent = totalScore;
    resetGame();
}

function resetGame() {
    isGameRunning = false;
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'block';
    gameCanvas.style.display = 'none';
    targetTextElement.style.display = 'none';
    collectedLetters.clear();
    score = 0;
    letters = [];
    fallSpeed = 2;
    spawnInterval = 1500;
    lastSpawnTime = 0;
    if (currentMode === 'custom') {
        inputText.value = currentText; // Aynı metni koru
    } else {
        document.getElementById('tongueTwisterSelect').value = currentText; // Aynı tekerlemeyi koru
    }
    resizeCanvas(); // Yeniden boyut ayarla
}

retryButton.addEventListener('click', () => {
    resetGame();
    startGame();
});

menuButton.addEventListener('click', resetGame);

canvas.addEventListener('mousemove', (e) => {
    if (isGameRunning) {
        const rect = canvas.getBoundingClientRect();
        player.x = e.clientX - rect.left;
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (isGameRunning) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        player.x = touch.clientX - rect.left;
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    }
});
