// ** CONSTANS ** //
const figures = document.getElementById("figures");
const restart = document.getElementById("restart");
const inputDiv = document.getElementById("input");
const gameOver = document.getElementById("gameOver");
const playerImg = document.getElementById("playerImg");
const nameInput = document.getElementById("nameInput");
const scoreValue = document.getElementById("scoreValue");
const timerValue = document.getElementById("timerValue");
const startButton = document.getElementById("start");
const opponentImg = document.getElementById("opponentImg");
const finalScoreValue = document.getElementById("finalScoreValue");
const exclamationMark = document.getElementById("!");
const finalScoreMessage = document.getElementById("finalScore");
const scoreboardDisplay = document.getElementById("scoreboard");
// ** SOUNDS ** //
const jakBabeSound = new Audio("sounds/jakBabe.mp3");
const truTuTuSound = new Audio("sounds/truTuTu.mp3");
const noCoJestSound = new Audio("sounds/noCoJest.mp3");
const dlaczegoSound = new Audio("sounds/dlaczego.mp3");
const gameOverSound = new Audio("sounds/gameOver.mp3");
const zCalychSilSound = new Audio("sounds/zCalychSil.mp3");
const wpiszLoginSound = new Audio("sounds/wpiszLogin.mp3");
const nicNieCzujeSound = new Audio("sounds/nicNieCzuje.mp3");
const kapitanDupaSound = new Audio("sounds/kapitanDupa.mp3");
const miernyWynikSound = new Audio("sounds/miernyWynik.mp3");
const sprobujJeszczeRaz = new Audio("sounds/sprobujJeszczeRaz.mp3");
const rundaPierwszaSound = new Audio("sounds/rundaPierwsza.mp3");
const najwyzszyWynikSound = new Audio("sounds/najwyzszyWynik.mp3");
// ** VARIABLES ** //
let time = 9;
let count = 0;
let gameActive = false;
let isPressed = false;
let scores = [];
let topOne = 0;

// ** LEADERBOARD & SCORES.JSON INTEGRATION ** //
async function loadScores() {
    try {
        const response = await fetch("/scores");
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                scores = data;
                localStorage.setItem("scores", JSON.stringify(scores));
            }
        } else {
            throw new Error("Brak endpointu /scores");
        }
    } catch (e) {
        // Fallback: próba odczytu z pliku scores.json lub localStorage
        try {
            const staticResp = await fetch("scores.json");
            if (staticResp.ok) {
                scores = await staticResp.json();
            } else {
                scores = JSON.parse(localStorage.getItem("scores")) || [];
            }
        } catch (err) {
            scores = JSON.parse(localStorage.getItem("scores")) || [];
        }
    }

    scores.sort((a, b) => b.value - a.value);
    topOne = scores[0] ? scores[0].value : 0;
    return scores;
}

// Inicjalne załadowanie wyników przy starcie
loadScores();

// Pobieranie top N wyników
function getBestScores(number) {
    scores.sort((a, b) => b.value - a.value);
    return scores.slice(0, number);
}

// ** FUNCTIONS ** //
// start the action sound, clock and show the seconds in the timer
function startCountdown() {
    truTuTuSound.play();
    // sounds loop
    truTuTuSound.onended = () => {
        const randomNum = Math.floor(Math.random() * 6);

        if (randomNum === 0) {
            nicNieCzujeSound.play();
            nicNieCzujeSound.onended = () => {
                truTuTuSound.play();
            };
        } else if (randomNum === 1) {
            dlaczegoSound.play();
            dlaczegoSound.onended = () => {
                truTuTuSound.play();
            };
        } else if (randomNum === 2) {
            jakBabeSound.play();
            jakBabeSound.onended = () => {
                truTuTuSound.play();
            };
        } else if (randomNum === 3) {
            noCoJestSound.play();
            noCoJestSound.onended = () => {
                truTuTuSound.play();
            };
        } else if (randomNum === 4) {
            zCalychSilSound.play();
            zCalychSilSound.onended = () => {
                truTuTuSound.play();
            };
        } else {
            truTuTuSound.play();
        }
    };

    const countdownInterval = setInterval(function () {
        if (time >= 0) {
            timerValue.textContent = time + "sek";
            time--;
        } else {
            clearInterval(countdownInterval);
            truTuTuSound.pause();
            jakBabeSound.pause();
            truTuTuSound.pause();
            dlaczegoSound.pause();
            noCoJestSound.pause();
            zCalychSilSound.pause();
            nicNieCzujeSound.pause();
            jakBabeSound.onended = undefined;
            truTuTuSound.onended = undefined;
            dlaczegoSound.onended = undefined;
            noCoJestSound.onended = undefined;
            zCalychSilSound.onended = undefined;
            nicNieCzujeSound.onended = undefined;

            endGame();
        }
    }, 1000);
}

function endGame() {
    gameActive = false;
    figures.style.display = "none";
    gameOver.style.display = "block";
    gameOver.style.animation = "blink 0.3s 10";

    document.onkeyup = undefined;
    document.onkeydown = undefined;

    gameOverSound.play();
    gameOverSound.onended = () => {
        gameOver.style.display = "none";
        finalScoreValue.textContent = count;
        finalScoreMessage.style.display = "flex";
        exclamationMark.style.animation = "blink 0.6s 5";
        finalScoreValue.style.animation = "blink 0.55s 5";

        if (count > 0 && count > topOne && topOne > 0) {
            // Nowy rekord całej gry!
            najwyzszyWynikSound.play();
            najwyzszyWynikSound.onended = () => {
                wpiszLoginSound.play();
                finalScoreMessage.style.display = "none";
                inputDiv.style.display = "flex";
                nameInput.style.display = "block";
                nameInput.focus();
            };
        } else if (count > 0) {
            // Wynik zdobyty, prośba o nick (zaktualizuje rekord gracza w scores.json)
            miernyWynikSound.play();
            miernyWynikSound.onended = () => {
                wpiszLoginSound.play();
                finalScoreMessage.style.display = "none";
                inputDiv.style.display = "flex";
                nameInput.style.display = "block";
                nameInput.focus();
            };
        } else {
            // 0 punktów
            miernyWynikSound.play();
            miernyWynikSound.onended = () => {
                kapitanDupaSound.play();
                kapitanDupaSound.onended = () => {
                    sprobujJeszczeRaz.play();
                    finalScoreMessage.style.display = "none";
                    restart.style.display = "block";
                };
            };
        }
    };
}

function showScoreboard() {
    scoreboardDisplay.innerHTML = "<h3>TOP 10 SCOREBOARD</h3>";
    const topTen = getBestScores(10);

    topTen.forEach(function (score, index) {
        scoreboardDisplay.innerHTML +=
            "<p><span>" +
            (index + 1) +
            ". " +
            score.name +
            "</span><span>" +
            score.value +
            "</span></p>";
    });

    scoreboardDisplay.innerHTML +=
        '<a href="leaderboard.html" class="crt-link">🏆 ZOBACZ PEŁNY RANKING (TOP 100+) ➔</a>';

    scoreboardDisplay.style.display = "flex";
    kapitanDupaSound.play();
    kapitanDupaSound.onended = () => {
        sprobujJeszczeRaz.play();
        restart.style.display = "block";
    };
}

async function saveScore() {
    const rawName = nameInput.value.trim().toUpperCase();
    if (rawName !== "") {
        const newScore = count;

        // 1. Sprawdź czy dany gracz już istnieje (aktualizacja rekordu dla tego nicku)
        const existingIndex = scores.findIndex(
            (s) => String(s.name).trim().toUpperCase() === rawName
        );

        if (existingIndex !== -1) {
            // Jeśli istnieje: aktualizuj tylko gdy nowy wynik jest wyższy niż dotychczasowy rekord
            if (newScore > scores[existingIndex].value) {
                scores[existingIndex].value = newScore;
            }
        } else {
            // Nowy gracz
            scores.push({ name: rawName, value: newScore });
        }

        scores.sort((a, b) => b.value - a.value);
        topOne = scores[0] ? scores[0].value : 0;
        localStorage.setItem("scores", JSON.stringify(scores));

        // 2. Wyślij do serwera w celu trwałego zapisu w pliku scores.json
        try {
            const res = await fetch("/scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: rawName, value: newScore })
            });
            if (res.ok) {
                const serverScores = await res.json();
                if (Array.isArray(serverScores)) {
                    scores = serverScores;
                    scores.sort((a, b) => b.value - a.value);
                    topOne = scores[0] ? scores[0].value : 0;
                    localStorage.setItem("scores", JSON.stringify(scores));
                }
            }
        } catch (err) {
            console.warn("Brak serwera HTTP, wynik zapisano w pamięci podręcznej:", err);
        }

        // 3. Wyczyść formularz i wyświetl tablicę wyników
        nameInput.value = "";
        inputDiv.style.display = "none";
        scoreboardDisplay.innerHTML = "";

        showScoreboard();
    }
}

// ** HANDLES ** //
// hanle when user finish pushing the space or finish the touch
function handleActionFinish() {
    if (isPressed) {
        playerImg.setAttribute("src", "images/deactive.svg");
    }
    isPressed = false;
    count += 10;

    const hitsNo = Math.floor(count / 100);

    if (hitsNo > 0 && hitsNo <= 9) {
        document
            .getElementById(`hit${hitsNo}`)
            .setAttribute("fill", "#a40000ff");
    }
    scoreValue.textContent = count;
}

startButton.onclick = () => {
    rundaPierwszaSound.play();
    startButton.style.animation = "blink 0.8s 10";
    // start the game when the sound has ended
    rundaPierwszaSound.onended = () => {
        startButton.style.display = "none";
        figures.style.display = "flex";

        gameActive = true;
        // add all the hooks for the space and touch
        document.onkeydown = (event) => {
            event.preventDefault();
            if (gameActive && !isPressed) {
                playerImg.setAttribute("src", "images/active.svg");
                isPressed = true;
            }
        };

        document.onkeyup = () => {
            gameActive && handleActionFinish();
        };

        document.ontouchstart = () => {
            if (gameActive && !isPressed) {
                playerImg.setAttribute("src", "images/active.svg");
                isPressed = true;
            }
        };

        document.ontouchend = () => {
            gameActive && handleActionFinish();
        };

        startCountdown();
    };
};

// no save button so just handle enter as it
nameInput.onkeydown = (event) => {
    if (event.key === "Enter" || event.keyCode === 13) {
        saveScore();
    }
};

// restart the game
restart.onclick = () => {
    time = 9;
    count = 0;
    // odśwież wyniki
    loadScores();
    topOne = getBestScores(1)[0] ? getBestScores(1)[0].value : 0;

    timerValue.textContent = "9sek";
    scoreValue.textContent = "0";
    restart.style.display = "none";
    scoreboardDisplay.style.display = "none";

    for (let i = 1; i <= 9; i++) {
        document.getElementById(`hit${i}`).setAttribute("fill", "#8ae234");
    }

    startButton.style.display = "flex";
    startButton.style.animation = "blink 0.8s 10";
    startButton.click();
};
