# KORA — Farm-to-Buyer Intelligence Platform (full-stack local build)

A working full-stack build of **KORA**: a glassmorphism (macOS/iOS-style) front end
with an **essence of water**, over an earthy **clay + gold** brand — now backed by a
real **phone-OTP auth + marketplace API** so login, registration, listings, bids and
service requests actually work.

Built entirely on the **Python standard library + SQLite** — no `pip install`,
no framework. One command runs the whole thing.

KORA connects Farmer Producer Organisations (FPOs) and farmers directly with bulk
buyers, with AI demand forecasting, pooled spoilage-aware logistics and transparent
itemised pricing. Built by undergraduate students of **IIM Sirmaur** for the
*Introduction to Programming Language* course. Landing-page copy is drawn from the
team's research brief.

## Requirements

- Python 3.8+ (`python3 --version`). Nothing else.
- Internet is used only to load Google Fonts (Montserrat). Images are bundled.

## Run it

```bash
cd kora
python3 server.py
```

Open <http://127.0.0.1:8000/>.

### Options

```bash
python3 server.py --open          # launch your browser automatically
python3 server.py --port 9000     # different port
python3 server.py --host 0.0.0.0  # reachable from other devices on your LAN
python3 server.py --reset         # wipe the database and start fresh
```

Stop with `Ctrl+C`.

## Try the full flow (pilot mode)

No SMS gateway is wired up, so **the one-time code is shown on screen** (and printed
in the terminal) when you request it — this matches the platform's "simulated data"
disclosure.

1. From the landing page click **Get started** → pick **Farmer**, enter a name and any
   10-digit number, accept the terms, **Send OTP**. The code appears on screen — enter
   it to land in the farmer dashboard.
2. **Publish a listing** (e.g. Tomato, 500 kg, ₹14/kg).
3. Open a second browser (or a private window), **register as a Buyer**, browse the
   listing and **place a bid**.
4. Back as the farmer, **accept** the bid — the listing closes and the buyer sees it
   marked *accepted*.
5. Register a **Supplier** to see and respond to **service requests** (which buyers and
   farmers can raise for transport, quality testing, machinery or warehousing).

## Project layout

```
kora/
├── server.py              # stdlib HTTP server: static files + JSON API + routing
├── app/
│   ├── db.py              # SQLite schema + connection
│   ├── auth.py            # OTP generation/verification + sessions
│   └── api.py             # all API handlers (auth, listings, bids, services, stats)
├── kora.db                # created on first run (SQLite; safe to delete / --reset)
├── README.md
└── static/
    ├── index.html         # landing page (14 sections, glass + water)
    ├── login.html · register.html · dashboard.html
    ├── terms.html · privacy.html · delete-account.html
    ├── css/  styles.css   (design system) · app.css (auth + dashboard)
    ├── js/   api.js · i18n.js · main.js · auth.js · dashboard.js
    └── images/ farm-hero.jpg · kora-logo.jpg
```

## API reference

All endpoints are under `/api`. The session is a signed, HttpOnly cookie set on OTP
verification. Bodies and responses are JSON.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/request-otp` | — | Generate an OTP (returned on screen in pilot mode) |
| POST | `/api/auth/verify-otp` | — | Verify OTP; create account on first sign-in; start session |
| POST | `/api/auth/logout` | any | End the session |
| GET | `/api/me` | any | Current signed-in user |
| DELETE | `/api/account` | any | Delete account + all related data |
| GET | `/api/stats` | any | Role-based dashboard counts |
| GET | `/api/listings` | auth | Active produce listings |
| POST | `/api/listings` | farmer | Create a listing |
| GET | `/api/listings/mine` | farmer | Own listings, each with its bids |
| DELETE | `/api/listings/{id}` | farmer | Close a listing |
| POST | `/api/listings/{id}/bids` | buyer | Place a bid |
| GET | `/api/bids/mine` | buyer | Own bids with status |
| POST | `/api/bids/{id}/accept` · `/reject` | farmer | Decide a bid (accept closes the listing) |
| GET | `/api/service-requests` | any | Suppliers see open requests; others see their own |
| POST | `/api/service-requests` | farmer/buyer | Raise a service request |
| POST | `/api/service-requests/{id}/respond` | supplier | Respond to a request |

## Languages

Every page — landing, login, register, dashboard, terms, privacy and delete
account — switches between **English, हिंदी, తెలుగు, தமிழ், ગુજરાતી, मराठी and ਪੰਜਾਬੀ**.
The choice is remembered across pages and visits.

- `static/js/translations.js` — one row per string:
  `[English, hi, te, ta, gu, mr, pa]`. The English text is the key, so the
  HTML needs no special markup.
- `static/js/i18n.js` — walks every text node, placeholder and dropdown option
  on the page and swaps in the translation; a MutationObserver translates
  anything added later (dashboard lists, error messages, button states), so
  switching language works live without a reload.
- Brand names, acronyms (OTP, GST, FPO, AI…), numbers, prices, emails and
  user-entered data are intentionally left as-is.
- **To add or fix a string:** add a row to `translations.js` with the exact
  English text as it appears on the page. Anything without a row stays English.
- Indic scripts get Noto Sans fallbacks and relaxed letter-spacing/line-height
  so conjuncts and vowel marks render correctly.

## Design system

- **Brand clay** `#713D2B` · **gold** `#c9a227` · **soft gold** `#f4e9c8`
- **Water-teal** `#2f93ab` · **water-deep** `#0e3f50` · **deep bg token** `#020617`
- **Headings:** Montserrat ExtraBold/Black. **Body:** Arial.
- **Icons:** one inline SVG sprite of minimal line icons in frosted glass tiles — no emojis.
- **Glass:** a reusable `.glass` utility (blur, light border, inner highlight, diagonal
  sheen); floating glass navbar; drifting water "blobs" and a wave divider for the
  water motif.

## Notes & next steps

- **Security (pilot):** OTP is shown on screen because there's no SMS provider; sessions
  are server-side tokens in SQLite. Before any real deployment, wire a real SMS gateway,
  serve over HTTPS, and add rate-limiting.
- **Payments** are intentionally simulated — no banking integration in the pilot.
- The KORA name, logo and the farm photo are yours. Fonts are via Google Fonts (OFL).
