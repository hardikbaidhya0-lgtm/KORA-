#!/usr/bin/env python3
"""
KORA — full-stack local host (Python standard library only).

Serves the static front end from ./static and a JSON API under /api backed by
SQLite (./kora.db). No third-party packages — just `python3 server.py`.

Usage:
    python3 server.py                 # http://127.0.0.1:8000
    python3 server.py --port 9000
    python3 server.py --host 0.0.0.0  # expose on your LAN
    python3 server.py --open          # open a browser after starting
    python3 server.py --reset         # wipe kora.db and start fresh

Press Ctrl+C to stop.
"""
import argparse
import json
import os
import sys
import webbrowser
from http import cookies as http_cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import api, auth                       # noqa: E402
from app.db import DB_PATH, init_db             # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# pretty routes -> static html files
PAGES = {
    "/": "index.html",
    "/login": "login.html",
    "/register": "register.html",
    "/dashboard": "dashboard.html",
    "/terms": "terms.html",
    "/privacy": "privacy.html",
    "/delete-account": "delete-account.html",
}

MIME = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
    ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "KORA/1.0"

    # ---- helpers ----
    def _cookie_token(self):
        raw = self.headers.get("Cookie")
        if not raw:
            return None
        try:
            jar = http_cookies.SimpleCookie(raw)
            if auth.COOKIE_NAME in jar:
                return jar[auth.COOKIE_NAME].value
        except http_cookies.CookieError:
            return None
        return None

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            data = self.rfile.read(length)
            return json.loads(data or b"{}")
        except (ValueError, TypeError):
            return {}

    def _send_json(self, status, payload, set_cookie=None, clear_cookie=False):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if set_cookie is not None:
            c = http_cookies.SimpleCookie()
            c[auth.COOKIE_NAME] = set_cookie
            m = c[auth.COOKIE_NAME]
            m["path"] = "/"; m["httponly"] = True; m["samesite"] = "Lax"
            m["max-age"] = str(auth.SESSION_TTL)
            self.send_header("Set-Cookie", m.OutputString())
        if clear_cookie:
            self.send_header(
                "Set-Cookie",
                "%s=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" % auth.COOKIE_NAME)
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, path):
        _, ext = os.path.splitext(path)
        ctype = MIME.get(ext.lower(), "application/octet-stream")
        try:
            with open(path, "rb") as fh:
                body = fh.read()
        except OSError:
            self._send_json(404, {"error": "Not found"})
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _safe_static(self, url_path):
        rel = url_path.lstrip("/")
        target = os.path.normpath(os.path.join(STATIC_DIR, rel))
        if not target.startswith(STATIC_DIR):
            return None
        return target if os.path.isfile(target) else None

    # ---- API ----
    def _handle_api(self, method):
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path[len("/api"):].split("/") if p]
        body = self._read_json() if method in ("POST", "PUT", "DELETE") else {}
        user = auth.user_for_token(self._cookie_token())
        try:
            status, payload = api.dispatch(method, parts, body, user)
        except Exception as exc:  # never leak a stack trace to the client
            sys.stderr.write("  API error: %r\n" % exc)
            self._send_json(500, {"error": "Server error."})
            return
        set_cookie = payload.pop("_session", None) if isinstance(payload, dict) else None
        clear = bool(payload.pop("_logout", False)) if isinstance(payload, dict) else False
        self._send_json(status, payload, set_cookie=set_cookie, clear_cookie=clear)

    # ---- dispatch ----
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/") or path == "/api":
            return self._handle_api("GET")
        if path in PAGES:
            return self._serve_file(os.path.join(STATIC_DIR, PAGES[path]))
        static = self._safe_static(path)
        if static:
            return self._serve_file(static)
        # unknown -> landing page (client-side handles the rest)
        return self._serve_file(os.path.join(STATIC_DIR, "index.html"))

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._handle_api("POST")
        self._send_json(404, {"error": "Not found"})

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            return self._handle_api("DELETE")
        self._send_json(404, {"error": "Not found"})

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s - %s\n" % (self.address_string(), fmt % args))


def main():
    parser = argparse.ArgumentParser(description="Host KORA (front end + API) locally.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--open", action="store_true")
    parser.add_argument("--reset", action="store_true", help="Delete kora.db before starting.")
    args = parser.parse_args()

    if args.reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("  (database reset)")
    init_db()

    if not os.path.isfile(os.path.join(STATIC_DIR, "index.html")):
        sys.exit("error: static/index.html not found next to server.py")

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    shown = "127.0.0.1" if args.host in ("0.0.0.0", "::") else args.host
    url = "http://%s:%d/" % (shown, args.port)

    print("\n  \U0001F33E  KORA is running  (front end + API)")
    print("  " + "─" * 36)
    print("  Local:    %s" % url)
    if args.host in ("0.0.0.0", "::"):
        print("  Network:  http://<your-ip>:%d/" % args.port)
    print("  Database: %s" % DB_PATH)
    print("  Pilot:    OTPs are shown on screen (no SMS is sent)")
    print("  Stop:     Ctrl+C\n")

    if args.open:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped. \U0001F33E\n")
        httpd.server_close()


if __name__ == "__main__":
    main()
