#!/usr/bin/env python3
"""
Lekki serwer HTTP w Python 3 dla gry Kapitan Dupa.
Uruchomienie: python3 server.py
"""

import http.server
import json
import os
import socketserver
import urllib.parse

PORT = int(os.environ.get("PORT", 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCORES_FILE = os.path.join(BASE_DIR, "scores.json")

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".ico": "image/x-icon",
    ".png": "image/png",
}

def read_scores():
    if os.path.exists(SCORES_FILE):
        try:
            with open(SCORES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            print("Błąd odczytu scores.json:", e)
    return []

def write_scores(scores):
    try:
        with open(SCORES_FILE, "w", encoding="utf-8") as f:
            json.dump(scores, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print("Błąd zapisu scores.json:", e)
        return False

class GameHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/scores":
            limit_val = None
            if parsed.query:
                q = urllib.parse.parse_qs(parsed.query)
                if "limit" in q:
                    try:
                        limit_val = int(q["limit"][0])
                    except ValueError:
                        pass

            scores = read_scores()
            scores.sort(key=lambda s: s.get("value", 0), reverse=True)
            if limit_val and limit_val > 0:
                scores = scores[:limit_val]

            body = json.dumps(scores, indent=2).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/" or path == "":
            path = "/index.html"

        safe_path = os.path.normpath(path.lstrip("/"))
        file_path = os.path.join(BASE_DIR, safe_path)

        if os.path.isfile(file_path):
            _, ext = os.path.splitext(file_path)
            content_type = MIME_TYPES.get(ext.lower(), "application/octet-stream")

            with open(file_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/scores":
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8")

            try:
                payload = json.loads(raw_body)
                raw_name = str(payload.get("name", "")).strip().upper()
                new_value = int(payload.get("value", 0))

                if not raw_name:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"error": "Brak nicku"}')
                    return

                scores = read_scores()
                existing = None
                for s in scores:
                    if str(s.get("name", "")).strip().upper() == raw_name:
                        existing = s
                        break

                if existing is not None:
                    # Aktualizacja TYLKO jeśli nowy wynik jest większy od dotychczasowego
                    old_value = existing.get("value", 0)
                    if new_value > old_value:
                        existing["value"] = new_value
                        print(f"[REKORD] Gracz {raw_name} pobił swój rekord: {new_value} pkt!")
                    else:
                        print(f"[INFO] Gracz {raw_name} uzyskał {new_value} pkt (rekord: {old_value} pkt).")
                else:
                    scores.append({"name": raw_name, "value": new_value})
                    print(f"[NOWY] Dodano nowego gracza {raw_name}: {new_value} pkt!")

                scores.sort(key=lambda s: s.get("value", 0), reverse=True)
                write_scores(scores)

                resp_body = json.dumps(scores, indent=2).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
            except Exception as e:
                print("Błąd POST /scores:", e)
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "B\xc5\x82\xc4\x85d serwera"}')
            return

        self.send_response(404)
        self.end_headers()

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), GameHTTPRequestHandler) as httpd:
        print("====================================================")
        print("🚀 Gra Kapitan Dupa uruchomiona!")
        print(f"👉 Otwórz w przeglądarce: http://localhost:{PORT}")
        print("📁 Leaderboard zapisuje się w: scores.json")
        print("====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nZatrzymano serwer.")

if __name__ == "__main__":
    run()
