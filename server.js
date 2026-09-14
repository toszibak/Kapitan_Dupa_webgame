const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, "scores.json");

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".ico": "image/x-icon",
    ".png": "image/png"
};

function readScores() {
    try {
        if (fs.existsSync(SCORES_FILE)) {
            const raw = fs.readFileSync(SCORES_FILE, "utf-8");
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                return data;
            }
        }
    } catch (err) {
        console.error("Błąd odczytu scores.json:", err);
    }
    return [];
}

function writeScores(scores) {
    try {
        fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), "utf-8");
        return true;
    } catch (err) {
        console.error("Błąd zapisu scores.json:", err);
        return false;
    }
}

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let reqPath = decodeURIComponent(parsedUrl.pathname);

    // API: Pobieranie rankingu (z opcjonalnym limitem np. ?limit=10, 100, 1000)
    if (reqPath === "/scores" && req.method === "GET") {
        const limitParam = parsedUrl.searchParams.get("limit");
        let scores = readScores();
        scores.sort((a, b) => b.value - a.value);
        if (limitParam) {
            const limit = parseInt(limitParam, 10);
            if (!isNaN(limit) && limit > 0) {
                scores = scores.slice(0, limit);
            }
        }
        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
        });
        res.end(JSON.stringify(scores));
        return;
    }

    // API: Zapis / aktualizacja wyniku gracza
    if (reqPath === "/scores" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                const payload = JSON.parse(body);
                const rawName = String(payload.name || "").trim().toUpperCase();
                const newValue = Number(payload.value) || 0;

                if (!rawName) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Brak nicku" }));
                    return;
                }

                const scores = readScores();
                const existingIndex = scores.findIndex(
                    (s) => String(s.name).trim().toUpperCase() === rawName
                );

                if (existingIndex !== -1) {
                    // Jeśli gracz już istnieje: aktualizujemy TYLKO wtedy, gdy nowy wynik jest lepszy
                    if (newValue > scores[existingIndex].value) {
                        scores[existingIndex].value = newValue;
                        console.log(`[REKORD] Gracz ${rawName} pobił swój rekord: ${newValue} pkt!`);
                    } else {
                        console.log(`[INFO] Gracz ${rawName} uzyskał ${newValue} pkt (mniej lub równo dotychczasowemu: ${scores[existingIndex].value} pkt).`);
                    }
                } else {
                    // Nowy gracz na liście
                    scores.push({ name: rawName, value: newValue });
                    console.log(`[NOWY] Dodano nowego gracza ${rawName}: ${newValue} pkt!`);
                }

                scores.sort((a, b) => b.value - a.value);
                writeScores(scores);

                res.writeHead(200, {
                    "Content-Type": "application/json; charset=utf-8",
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(JSON.stringify(scores));
            } catch (err) {
                console.error("Błąd przetwarzania POST /scores:", err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Błąd serwera" }));
            }
        });
        return;
    }

    // Obsługa CORS preflight (OPTIONS)
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        });
        res.end();
        return;
    }

    // Serwowanie plików statycznych
    if (reqPath === "/") {
        reqPath = "/index.html";
    }

    const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(__dirname, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*"
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Gra Kapitan Dupa uruchomiona!`);
    console.log(`👉 Otwórz w przeglądarce: http://localhost:${PORT}`);
    console.log(`📁 Leaderboard zapisuje się w: scores.json`);
    console.log(`====================================================`);
});
