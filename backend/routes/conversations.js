const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/conversations/:sessionId
router.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required.' });

  try {
    const db = getDb();
    const messages = db.prepare(`
      SELECT id, session_id, role, content, tokens_used, created_at
      FROM messages
      WHERE session_id = ?
      ORDER BY id ASC
    `).all(sessionId);

    return res.json({ sessionId, messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error.' });
  }
});

module.exports = router;
