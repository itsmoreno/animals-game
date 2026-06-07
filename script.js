// ---- Constants ----
var GRAVITY     = 0.5;
var FLAP        = -9;
var PIPE_SPEED  = 4;
var PIPE_WIDTH  = 70;
var PIPE_CAP_H  = 20;
var GAP_SIZE    = 185;
var PIPE_MS     = 1800;
var GROUND_H    = 100;   // matches #ground height in CSS
var INFO_H      = 44;    // matches #info height (approx)

// ---- Animals & Themes ----
// difficulty: gravity, flap, pipeSpeed, gapSize, pipeMs
var animals = [
  { name: "קוף",      img: "assets/images/monkey.png",       theme: "jungle",  label: "קל",     gravity: 0.28, flap: -7.0, speed: 2.5, gap: 260, ms: 2600, pipeWidth: 52 },
  { name: "פינגווין", img: "assets/images/image.png",        theme: "arctic",  label: "בינוני", gravity: 0.50, flap: -9.0, speed: 4, gap: 185, ms: 1800, pipeWidth: 70 },
  { name: "אריה",     img: "assets/images/image copy.png",   theme: "savanna", label: "קשה",    gravity: 0.60, flap: -9.5, speed: 5, gap: 165, ms: 1600, pipeWidth: 76 },
  { name: "ציפור",    img: "assets/images/image copy 2.png", theme: "forest",  label: "קשה מאוד", gravity: 0.70, flap: -10.0, speed: 6.5, gap: 148, ms: 1400, pipeWidth: 52 }
];

// ---- State ----
var birdY       = 0;
var velocity    = 0;
var pipes       = [];
var score       = 0;
var highScore   = 0;
var gameRunning = false;
var selectedAnimalIdx = 0;
var highScores = [0, 0, 0, 0];   // one per animal

// Load saved high scores (one per animal) from a previous session, if valid
try {
  var savedHighScores = JSON.parse(localStorage.getItem("highScores"));
  if (Array.isArray(savedHighScores) && savedHighScores.length === highScores.length) {
    for (var hi = 0; hi < savedHighScores.length; hi++) {
      var hv = savedHighScores[hi];
      highScores[hi] = (typeof hv === "number" && isFinite(hv) && hv >= 0) ? hv : 0;
    }
  }
} catch (e) {
  // corrupt or missing data — keep the defaults
}

var gameInterval;
var pipeInterval;
var firstPipeTimeout;
var gamePaused = false;

// ---- Sounds ----
var pointSound    = new Audio("assets/sounds/point.wav");
var gameOverSound = new Audio("assets/sounds/game-over.wav");
var bgMusic       = new Audio("assets/sounds/background-music.mp3");
bgMusic.loop   = true;
bgMusic.volume = 0.4;

// ---- DOM refs ----
var gameEl      = document.getElementById("game");
var monkeyEl    = document.getElementById("monkey");
var scoreEl     = document.getElementById("score");
var highScoreEl = document.getElementById("highScore");
var startScreen = document.getElementById("startScreen");
var endScreen   = document.getElementById("endScreen");
var finalScore  = document.getElementById("finalScore");
var finalHigh        = document.getElementById("finalHighScore");
var animalPreviewEl  = document.getElementById("animalPreview");
var gameTitleEl      = document.getElementById("gameTitle");
var diffLabelEl      = document.getElementById("diffLabel");
var animalHighScoreEl = document.getElementById("animalHighScore");

// ---- Login ----
// שנה את הסיסמה כאן / change the password here
var GAME_PASSWORD = "MyGame123";

var infoScreen    = document.getElementById("infoScreen");
var loginScreen   = document.getElementById("loginScreen");
var passwordInput = document.getElementById("passwordInput");
var loginError    = document.getElementById("loginError");

var overlays = [infoScreen, loginScreen, startScreen, endScreen];

// Fade out whichever overlay is currently up, then bring the next one in.
function switchOverlay(target, focusInput) {
  var current = null;
  for (var i = 0; i < overlays.length; i++) {
    if (overlays[i] !== target && overlays[i].style.display !== "none") {
      current = overlays[i];
      break;
    }
  }

  function reveal() {
    target.style.display = "flex";
    if (focusInput) { passwordInput.focus(); }
  }

  if (current) {
    current.classList.add("fade-out");
    setTimeout(function () {
      current.style.display = "none";
      current.classList.remove("fade-out");
      reveal();
    }, 350);
  } else {
    reveal();
  }
}

function showStartScreen() {
  updateAnimalSelector();
  switchOverlay(startScreen);
}

// Move from the welcome page to the login page (or straight to the
// lobby if this player already logged in before)
function showLoginScreen() {
  if (localStorage.getItem("loggedIn") === "true") {
    showStartScreen();
  } else {
    switchOverlay(loginScreen, true);
  }
}

function tryLogin() {
  if (passwordInput.value === GAME_PASSWORD) {
    localStorage.setItem("loggedIn", "true");   // remember this player
    showStartScreen();
  } else {
    loginError.textContent = "סיסמה שגויה, נסה שוב";
    passwordInput.value = "";
    passwordInput.focus();
  }
}

// The welcome (info) page is the entry point and shows first.
document.getElementById("infoContinueBtn").onclick = showLoginScreen;

// Back from the login page to the welcome page
document.getElementById("loginBackBtn").onclick = function () {
  loginError.textContent = "";
  switchOverlay(infoScreen);
};

// Log out: forget this player and return to the welcome page
document.getElementById("logoutBtn").onclick = function () {
  localStorage.removeItem("loggedIn");
  passwordInput.value = "";
  switchOverlay(infoScreen);
};

document.getElementById("loginBtn").onclick = tryLogin;
passwordInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") { e.preventDefault(); tryLogin(); }
});

document.getElementById("startBtn").onclick   = function(e) { e.stopPropagation(); startGame(); };
document.getElementById("restartBtn").onclick = function(e) { e.stopPropagation(); startGame(); };
gameEl.addEventListener("click", flap);
document.addEventListener("keydown", function(e) {
  if (!gameRunning) { return; }
  if (e.code === "Space" || e.key === "ArrowUp" || e.key === " ") {
    e.preventDefault();
    flap();
  }
});

// Pause everything when the tab is hidden mid-game, resume when it returns
document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    if (gameRunning && !gamePaused) {
      gamePaused = true;
      clearInterval(gameInterval);
      clearInterval(pipeInterval);
      clearTimeout(firstPipeTimeout);
      bgMusic.pause();
    }
  } else if (gameRunning && gamePaused) {
    gamePaused = false;
    gameInterval = setInterval(gameLoop, 20);
    pipeInterval = setInterval(spawnPipe, PIPE_MS);
    var bgResume = bgMusic.play();
    if (bgResume) { bgResume.catch(function() {}); }
  }
});

document.getElementById("prevAnimal").onclick = function() {
  selectedAnimalIdx = (selectedAnimalIdx - 1 + animals.length) % animals.length;
  updateAnimalSelector();
};

document.getElementById("nextAnimal").onclick = function() {
  selectedAnimalIdx = (selectedAnimalIdx + 1) % animals.length;
  updateAnimalSelector();
};

document.getElementById("lobbyBtn").onclick = function() {
  monkeyEl.style.display = "none";
  showStartScreen();
};

// ---- Mute / unmute ----
var muteBtn = document.getElementById("muteBtn");
var isMuted = localStorage.getItem("muted") === "true";

function applyMute() {
  bgMusic.muted       = isMuted;
  pointSound.muted    = isMuted;
  gameOverSound.muted = isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🔊";
  muteBtn.classList.toggle("muted", isMuted);
}
applyMute();

muteBtn.onclick = function (e) {
  e.stopPropagation();          // don't trigger a flap
  isMuted = !isMuted;
  localStorage.setItem("muted", isMuted ? "true" : "false");
  applyMute();
};


// ---- Game Start ----
function startGame() {
  clearInterval(gameInterval);
  clearInterval(pipeInterval);
  clearTimeout(firstPipeTimeout);
  gamePaused = false;

  // Clear existing pipes from DOM
  for (var i = 0; i < pipes.length; i++) {
    pipes[i].topEl.remove();
    pipes[i].botEl.remove();
    if (pipes[i].coinEl) pipes[i].coinEl.remove();
  }
  pipes = [];

  var animal = animals[selectedAnimalIdx];

  // Apply difficulty
  GRAVITY    = animal.gravity;
  FLAP       = animal.flap;
  PIPE_SPEED = animal.speed;
  GAP_SIZE   = animal.gap;
  PIPE_MS    = animal.ms;
  PIPE_WIDTH = animal.pipeWidth;

  score    = 0;
  velocity = 0;
  highScore = highScores[selectedAnimalIdx];
  scoreEl.textContent     = 0;
  highScoreEl.textContent = highScore;
  monkeyEl.src = animal.img;
  gameEl.setAttribute("data-theme", animal.theme);

  // Position bird vertically in centre of play area
  var playH = gameEl.offsetHeight - GROUND_H - INFO_H;
  birdY = INFO_H + playH / 2 - monkeyEl.offsetHeight / 2;
  monkeyEl.style.top = birdY + "px";
  monkeyEl.style.transform = "rotate(0deg)";
  monkeyEl.style.display = "block";

  startScreen.style.display = "none";
  endScreen.style.display   = "none";

  gameRunning = true;

  bgMusic.currentTime = 0;
  var bgPlay = bgMusic.play();
  if (bgPlay) { bgPlay.catch(function() {}); }

  gameInterval = setInterval(gameLoop, 20);
  pipeInterval = setInterval(spawnPipe, PIPE_MS);

  // Spawn first pipe quickly so there's something to dodge right away
  firstPipeTimeout = setTimeout(spawnPipe, 600);
}


// ---- Flap ----
function flap() {
  if (!gameRunning) { return; }
  velocity = FLAP;
}


// ---- Main Loop ----
function gameLoop() {
  velocity += GRAVITY;
  birdY    += velocity;

  var gameH  = gameEl.offsetHeight;
  var floorY = gameH - GROUND_H - monkeyEl.offsetHeight;

  // Hit floor
  if (birdY >= floorY) {
    birdY = floorY;
    monkeyEl.style.top = birdY + "px";
    endGame();
    return;
  }

  // Hit ceiling
  if (birdY <= INFO_H) {
    birdY    = INFO_H;
    velocity = 0;
  }

  monkeyEl.style.top = birdY + "px";

  // Bird hitbox (slightly inset for fairness)
  var birdLeft  = monkeyEl.offsetLeft + 8;
  var birdRight = birdLeft + monkeyEl.offsetWidth - 16;
  var birdTop   = birdY + 8;
  var birdBot   = birdY + monkeyEl.offsetHeight - 8;

  // Move pipes & check collisions
  for (var i = pipes.length - 1; i >= 0; i--) {
    var p = pipes[i];
    p.x -= PIPE_SPEED;
    p.topEl.style.left = p.x + "px";
    p.botEl.style.left = p.x + "px";

    var pLeft  = p.x;
    var pRight = p.x + PIPE_WIDTH;

    // Coin collection
    if (p.coinEl && !p.coinCollected) {
      var COIN_SIZE = 36;
      var coinCX = p.x + PIPE_WIDTH / 2 - COIN_SIZE / 2;
      p.coinEl.style.left = coinCX + "px";
      var coinTop = (p.gapTop + p.gapBot) / 2 - COIN_SIZE / 2;
      var coinBot = coinTop + COIN_SIZE;
      if (birdRight > coinCX && birdLeft < coinCX + COIN_SIZE &&
          birdBot > coinTop && birdTop < coinBot) {
        p.coinCollected = true;
        p.coinEl.remove();
        p.coinEl = null;
        score++;
        scoreEl.textContent = score;
        pointSound.currentTime = 0;
        var pointPlay = pointSound.play();
        if (pointPlay) { pointPlay.catch(function() {}); }
      }
    }

    // Collision check (only when horizontally overlapping)
    if (birdRight > pLeft && birdLeft < pRight) {
      if (birdTop < p.gapTop || birdBot > p.gapBot) {
        endGame();
        return;
      }
    }

    // Remove pipes that scrolled off screen
    if (p.x + PIPE_WIDTH < -20) {
      p.topEl.remove();
      p.botEl.remove();
      if (p.coinEl) p.coinEl.remove();
      pipes.splice(i, 1);
    }
  }
}


// ---- Spawn Pipe ----
function spawnPipe() {
  if (!gameRunning) { return; }

  var gameH = gameEl.offsetHeight;
  var playH = gameH - GROUND_H - INFO_H;

  // Gap centre is somewhere between 28 % and 72 % of play area
  var gapCenterMin = INFO_H + playH * 0.28;
  var gapCenterMax = INFO_H + playH * 0.72;
  var gapCenter    = gapCenterMin + Math.random() * (gapCenterMax - gapCenterMin);

  var gapTop = gapCenter - GAP_SIZE / 2;
  var gapBot = gapCenter + GAP_SIZE / 2;

  var topPipeH = gapTop - INFO_H;
  var botPipeH = gameH - GROUND_H - gapBot;
  if (topPipeH < 0) { topPipeH = 0; }
  if (botPipeH < 0) { botPipeH = 0; }
  var startX   = gameEl.offsetWidth + 10;

  // --- Top pipe ---
  var topEl = document.createElement("div");
  topEl.className    = "pipe";
  topEl.style.left   = startX + "px";
  topEl.style.top    = INFO_H + "px";
  topEl.style.height = topPipeH + "px";

  var topCap = document.createElement("div");
  topCap.className    = "pipe-cap pipe-top-cap";
  topCap.style.bottom = "0";   // cap at the bottom of the top pipe
  topEl.appendChild(topCap);
  gameEl.appendChild(topEl);

  // --- Bottom pipe ---
  var botEl = document.createElement("div");
  botEl.className    = "pipe";
  botEl.style.left   = startX + "px";
  botEl.style.top    = gapBot + "px";
  botEl.style.height = botPipeH + "px";

  var botCap = document.createElement("div");
  botCap.className = "pipe-cap pipe-bot-cap";
  botCap.style.top = "0";      // cap at the top of the bottom pipe
  botEl.appendChild(botCap);
  gameEl.appendChild(botEl);

  // --- Coin ---
  var COIN_SIZE = 36;
  var coinEl = document.createElement("img");
  coinEl.className = "coin";
  coinEl.src = "assets/images/coin.png";
  coinEl.style.left = (startX + PIPE_WIDTH / 2 - COIN_SIZE / 2) + "px";
  coinEl.style.top  = ((gapTop + gapBot) / 2 - COIN_SIZE / 2) + "px";
  gameEl.appendChild(coinEl);

  pipes.push({
    x:             startX,
    topEl:         topEl,
    botEl:         botEl,
    gapTop:        gapTop,
    gapBot:        gapBot,
    scored:        false,
    coinEl:        coinEl,
    coinCollected: false
  });
}


// ---- End Game ----
function endGame() {
  gameRunning = false;
  clearInterval(gameInterval);
  clearInterval(pipeInterval);

  // quick shake to sell the crash
  gameEl.classList.add("shake");
  setTimeout(function () { gameEl.classList.remove("shake"); }, 400);

  bgMusic.pause();

  var isNewRecord = score > highScore;
  if (isNewRecord) {
    highScore = score;
    highScores[selectedAnimalIdx] = score;
    try {
      localStorage.setItem("highScores", JSON.stringify(highScores));
    } catch (e) {
      // storage full or blocked — record still kept in memory for this session
    }
  }
  document.getElementById("newRecord").style.display = isNewRecord ? "block" : "none";

  gameOverSound.currentTime = 0;
  var gameOverPlay = gameOverSound.play();
  if (gameOverPlay) { gameOverPlay.catch(function() {}); }

  finalScore.textContent  = score;
  finalHigh.textContent   = highScore;
  highScoreEl.textContent = highScore;

  endScreen.style.display = "flex";
  monkeyEl.style.display = "none";
}


// ---- Animal Selector ----
function updateAnimalSelector() {
  var animal = animals[selectedAnimalIdx];
  animalPreviewEl.src     = animal.img;
  animalPreviewEl.alt     = animal.name;
  gameTitleEl.textContent = animal.name;
  diffLabelEl.textContent = animal.label;
  diffLabelEl.className   = "diff-" + animal.theme;
  gameEl.setAttribute("data-theme", animal.theme);
  animalHighScoreEl.textContent = "🏆 השיא שלך: " + highScores[selectedAnimalIdx];
}

updateAnimalSelector();