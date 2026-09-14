const fs = require("fs");
const path = require("path");

// Domyślne wyniki wczytywane z pliku scores.json
function getDefaultScores() {
    try {
        const filePath = path.join(process.cwd(), "scores.json");
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                return data;
            }
        }
    } catch (e) {
        console.error("Błąd odczytu lokalnego scores.json:", e);
    }
    return [
        { name: "KAPITAN", value: 3400 },
        { name: "RUCHACZ", value: 2200 },
        { name: "KUTAS", value: 1500 }
    ];
}

// Zmienne środowiskowe Vercel KV / Upstash Redis (dostępne po podpięciu Storage -> KV w Vercelu)
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function getKVScores() {
    if (!KV_URL || !KV_TOKEN) return null;
    try {
        const res = await fetch(`${KV_URL}/get/scores`, {
            headers: { Authorization: `Bearer ${KV_TOKEN}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.result !== null && data.result !== undefined) {
                return typeof data.result === "string" ? JSON.parse(data.result) : data.result;
            }
        }
    } catch (err) {
        console.error("Błąd pobierania z Vercel KV:", err);
    }
    return null;
}

async function setKVScores(scores) {
    if (!KV_URL || !KV_TOKEN) return false;
    try {
        const res = await fetch(`${KV_URL}/set/scores`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${KV_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(JSON.stringify(scores))
        });
        return res.ok;
    } catch (err) {
        console.error("Błąd zapisu do Vercel KV:", err);
        return false;
    }
}

// Pamięć podręczna instancji funkcji (fallback)
let memoryScores = null;

module.exports = async (req, res) => {
    // Nagłówki CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    // 1. Pobierz aktualne wyniki (z Vercel KV lub pamięci/scores.json)
    let scores = await getKVScores();
    if (!scores) {
        if (!memoryScores) {
            memoryScores = getDefaultScores();
        }
        scores = memoryScores;
    }

    // GET: Zwróć ranking posortowany malejąco (z opcjonalnym limitem np. ?limit=10, 100, 1000)
    if (req.method === "GET") {
        scores.sort((a, b) => b.value - a.value);
        const urlObj = new URL(req.url, "http://localhost");
        const limitParam = urlObj.searchParams.get("limit") || (req.query && req.query.limit);
        const limit = parseInt(limitParam, 10);
        if (!isNaN(limit) && limit > 0) {
            return res.status(200).json(scores.slice(0, limit));
        }
        return res.status(200).json(scores);
    }

    // POST: Zapisz / zaktualizuj rekord gracza
    if (req.method === "POST") {
        try {
            // Bezpieczne parsowanie body (req.body w Vercel jest już sparsowanym obiektem dla application/json)
            let body = req.body;
            if (typeof body === "string") {
                try {
                    body = JSON.parse(body);
                } catch (_) {}
            }
            body = body || {};

            const rawName = String(body.name || "").trim().toUpperCase();
            const newValue = Number(body.value) || 0;

            if (!rawName) {
                return res.status(400).json({ error: "Brak nicku" });
            }

            const existingIndex = scores.findIndex(
                (s) => String(s.name).trim().toUpperCase() === rawName
            );

            if (existingIndex !== -1) {
                // Aktualizujemy tylko gdy nowy wynik jest lepszy od dotychczasowego rekordu
                if (newValue > scores[existingIndex].value) {
                    scores[existingIndex].value = newValue;
                }
            } else {
                scores.push({ name: rawName, value: newValue });
            }

            scores.sort((a, b) => b.value - a.value);

            // Zapis do trwałej bazy KV (jeśli skonfigurowano na Vercelu)
            if (KV_URL && KV_TOKEN) {
                await setKVScores(scores);
            } else {
                memoryScores = scores;
            }

            return res.status(200).json(scores);
        } catch (err) {
            console.error("Błąd przetwarzania POST /api/scores:", err);
            return res.status(500).json({ error: "Błąd serwera" });
        }
    }

    return res.status(405).json({ error: "Metoda niedozwolona" });
};
