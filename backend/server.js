require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getDb } = require('./db');
const { chat } = require('./llm');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Rate limiting: 30 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── POST /api/chat ───────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return res.status(400).json({ error: 'sessionId is required.' });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'message is required.' });
  }

  const db = getDb();

  try {
    // Upsert session
    db.prepare(`
      INSERT INTO sessions (id) VALUES (?)
      ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')
    `).run(sessionId.trim());

    // Fetch last 10 messages (5 pairs) for context
    const history = db.prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT 10
    `).all(sessionId.trim());

    // Call LLM
    const { reply, tokensUsed } = await chat(history, message.trim());

    // Store user message
    db.prepare(`
      INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)
    `).run(sessionId.trim(), message.trim());

    // Store assistant reply
    db.prepare(`
      INSERT INTO messages (session_id, role, content, tokens_used) VALUES (?, 'assistant', ?, ?)
    `).run(sessionId.trim(), reply, tokensUsed);

    // Update session timestamp
    db.prepare(`UPDATE sessions SET updated_at = datetime('now') WHERE id = ?`).run(sessionId.trim());

    return res.json({ reply, tokensUsed });
  } catch (err) {
    console.error('Chat error:', err);
    if (err.message?.includes('API') || err.status) {
      return res.status(502).json({ error: 'LLM service error. Please try again.' });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/conversations/:sessionId ───────────────────────────────────────
app.get('/api/conversations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const db = getDb();

  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const messages = db.prepare(`
      SELECT id, role, content, tokens_used, created_at
      FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);

    return res.json({ sessionId, messages });
  } catch (err) {
    console.error('Fetch conversation error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/sessions ────────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  const db = getDb();

  try {
    const sessions = db.prepare(`
      SELECT s.id, s.created_at, s.updated_at,
             COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `).all();

    return res.json({ sessions });
  } catch (err) {
    console.error('List sessions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Support Assistant backend running on http://localhost:${PORT}`);
});

module.exports = app; // for testing
