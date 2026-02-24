const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { getLLMReply } = require('../llm');

// POST /api/chat
router.post('/', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required and must be a string.' });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'message is required and must be a non-empty string.' });
  }

  const db = getDb();

  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO sessions (id, created_at, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET updated_at = ?
    `).run(sessionId, now, now, now);

    db.prepare(`
      INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)
    `).run(sessionId, message.trim());

    // Get last 5 pairs (10 messages) for context
    const history = db.prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ?
      ORDER BY id DESC LIMIT 10
    `).all(sessionId).reverse();

    const llmMessages = history.map(m => ({ role: m.role, content: m.content }));

    const { reply, tokensUsed } = await getLLMReply(llmMessages);

    db.prepare(`
      INSERT INTO messages (session_id, role, content, tokens_used) VALUES (?, 'assistant', ?, ?)
    `).run(sessionId, reply, tokensUsed);

    db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), sessionId);

    return res.json({ reply, tokensUsed });
  } catch (err) {
    console.error('Chat error:', err);
    if (err.code === 'ERR_BAD_REQUEST' || err.status === 400) {
      return res.status(400).json({ error: 'Bad request to LLM service.' });
    }
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

module.exports = router;
