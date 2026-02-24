# ◈ Support Assistant

A full-stack AI-powered customer support chat application. Users interact with an intelligent assistant that answers questions strictly based on product documentation, with full session management and persistent SQLite storage.

![Support Assistant UI](./screenshots/chat.png)

---

## Tech Stack

- **Frontend:** React.js 18 with React Markdown
- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`)
- **LLM:** Claude (Anthropic) — `claude-sonnet-4-6`
- **Rate Limiting:** `express-rate-limit`
- **Containerization:** Docker + Docker Compose

---

## Features

- 🤖 Document-grounded AI responses (no hallucination)
- 💬 Session-based conversation history from SQLite
- 🧠 Last 5 message pairs used as context window
- 🆔 UUID-based session management via `localStorage`
- 📱 Responsive UI with dark editorial aesthetic
- ✨ Markdown rendering in assistant replies
- 🔒 IP-based rate limiting (30 req/min)
- 🐳 Docker Compose for one-command deployment
- 🧪 Backend unit tests with Jest + Supertest

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- An Anthropic API key ([get one here](https://console.anthropic.com))

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/support-assistant.git
cd support-assistant
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
npm start
```
Backend runs on `http://localhost:3001`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

### 4. Docker (Alternative)
```bash
# From project root
cp backend/.env.example backend/.env
# Add your ANTHROPIC_API_KEY to backend/.env
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

---

## API Documentation

### POST `/api/chat`
Send a user message and receive an AI-generated response.

**Request Body:**
```json
{
  "sessionId": "abc123",
  "message": "How can I reset my password?"
}
```

**Response:**
```json
{
  "reply": "Users can reset their password from Settings > Security > Reset Password...",
  "tokensUsed": 312
}
```

**Errors:**
| Status | Reason |
|--------|--------|
| 400 | Missing or empty `sessionId` / `message` |
| 429 | Rate limit exceeded (30 req/min per IP) |
| 502 | LLM API failure |
| 500 | Internal server error |

---

### GET `/api/conversations/:sessionId`
Retrieve all messages for a session in chronological order.

**Response:**
```json
{
  "sessionId": "abc123",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "How do I reset my password?",
      "tokens_used": 0,
      "created_at": "2024-01-15T10:30:00"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Users can reset their password from Settings > Security...",
      "tokens_used": 312,
      "created_at": "2024-01-15T10:30:02"
    }
  ]
}
```

**Errors:**
| Status | Reason |
|--------|--------|
| 404 | Session not found |
| 500 | Internal server error |

---

### GET `/api/sessions`
List all sessions with metadata.

**Response:**
```json
{
  "sessions": [
    {
      "id": "abc123",
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-01-15T10:35:00",
      "message_count": 6
    }
  ]
}
```

---

### GET `/api/health`
Health check endpoint.

**Response:** `{ "status": "ok" }`

---

## Database Schema

### `sessions` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT | Primary key — the UUID sessionId |
| `created_at` | DATETIME | Auto-set on insert |
| `updated_at` | DATETIME | Updated on each new message |

### `messages` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER | PK autoincrement |
| `session_id` | TEXT | FK → sessions.id (CASCADE DELETE) |
| `role` | TEXT | `"user"` or `"assistant"` |
| `content` | TEXT | Message text |
| `tokens_used` | INTEGER | Only set for assistant messages |
| `created_at` | DATETIME | Auto-set on insert |

---

## Document-Based Answering

The assistant answers **only** from `backend/docs.json`. The system prompt injects all documentation and instructs the LLM:

1. Only use the provided documentation to answer questions
2. If the question cannot be answered from docs → respond: *"Sorry, I don't have information about that."*
3. Do not guess or hallucinate

The last **5 user+assistant message pairs** (10 messages) are loaded from SQLite and included in each LLM call for context continuity.

---

## Customizing `docs.json`

Edit `backend/docs.json` to add your own product FAQs:
```json
[
  {
    "title": "Your Topic",
    "content": "Detailed answer text goes here."
  }
]
```

Restart the backend after editing. No re-embedding or retraining needed.

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- Input validation (missing sessionId, message)
- 404 for unknown sessions
- Sessions list endpoint
- Health check

---

## Project Structure

```
support-assistant/
├── backend/
│   ├── server.js          # Express app + API routes
│   ├── db.js              # SQLite connection + schema init
│   ├── llm.js             # Anthropic API client + prompt builder
│   ├── docs.json          # Product documentation (editable)
│   ├── server.test.js     # Jest unit tests
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main chat UI component
│   │   ├── App.css        # Styling
│   │   ├── api.js         # API client helpers
│   │   └── index.js       # React entry point
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Assumptions

1. **Single LLM Provider:** Claude (Anthropic) is used. To switch providers, edit `backend/llm.js` only.
2. **Full docs injection:** All docs are sent in every request (not embedding-based). For large doc sets, implement similarity search.
3. **Context window:** Last 10 messages (5 pairs) loaded from SQLite per API spec.
4. **Timezone:** All timestamps stored as UTC SQLite `datetime('now')`.
5. **Session persistence:** Sessions persist across browser restarts via `localStorage`.
6. **CORS:** Frontend URL must match `FRONTEND_URL` env var (default: `http://localhost:3000`).

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | — | Your Anthropic API key |
| `PORT` | No | `3001` | Server port |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS allowed origin |
| `DB_PATH` | No | `./support.db` | SQLite database file path |

### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_API_URL` | No | `` (uses proxy) | Backend base URL for production |
