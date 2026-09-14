const { MongoClient } = require("mongodb");

// Connection string z MongoDB Atlas (Environment Variable na Vercelu)
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "kapitan-dupa";
const COLLECTION = "scores";

// Cache połączenia między wywołaniami funkcji (ważne na Vercelu)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    if (!MONGODB_URI) {
        throw new Error("Brak zmiennej środowiskowej MONGODB_URI");
    }

    const client = new MongoClient(MONGODB_URI, {
        // Opcje zalecane dla serverless
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(DB_NAME);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

// Domyślne wyniki (używane tylko przy pierwszym uruchomieniu, gdy kolekcja jest pusta)
const DEFAULT_SCORES = [
    { name: "KAPITAN", value: 3400 },
    { name: "RUCHACZ", value: 2200 },
    { name: "KUTAS", value: 1500 },
];

module.exports = async (req, res) => {
    // Nagłówki CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection(COLLECTION);

        // GET: Zwróć ranking posortowany malejąco (z opcjonalnym limitem)
        if (req.method === "GET") {
            const urlObj = new URL(req.url, "http://localhost");
            const limitParam =
                urlObj.searchParams.get("limit") ||
                (req.query && req.query.limit);
            const limit = parseInt(limitParam, 10);

            let cursor = collection.find({}).sort({ value: -1 });

            if (!isNaN(limit) && limit > 0) {
                cursor = cursor.limit(limit);
            }

            let scores = await cursor.toArray();

            // Jeśli baza jest pusta – wstaw domyślne wyniki
            if (scores.length === 0) {
                await collection.insertMany(DEFAULT_SCORES);
                scores = DEFAULT_SCORES.slice().sort((a, b) => b.value - a.value);
                if (!isNaN(limit) && limit > 0) {
                    scores = scores.slice(0, limit);
                }
            }

            // Usuwamy _id z odpowiedzi (żeby frontend dostał czysty format)
            scores = scores.map(({ name, value }) => ({ name, value }));

            return res.status(200).json(scores);
        }

        // POST: Zapisz / zaktualizuj rekord gracza
        if (req.method === "POST") {
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

            // Szukamy istniejącego gracza
            const existing = await collection.findOne({ name: rawName });

            if (existing) {
                // Aktualizujemy tylko gdy nowy wynik jest lepszy
                if (newValue > existing.value) {
                    await collection.updateOne(
                        { name: rawName },
                        { $set: { value: newValue } }
                    );
                }
            } else {
                // Nowy gracz
                await collection.insertOne({ name: rawName, value: newValue });
            }

            // Zwracamy aktualny ranking (posortowany)
            const scores = await collection
                .find({})
                .sort({ value: -1 })
                .toArray();

            const cleanScores = scores.map(({ name, value }) => ({
                name,
                value,
            }));

            return res.status(200).json(cleanScores);
        }

        return res.status(405).json({ error: "Metoda niedozwolona" });
    } catch (err) {
        console.error("Błąd /api/scores:", err);
        return res.status(500).json({
            error: "Błąd serwera",
            details: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
};
