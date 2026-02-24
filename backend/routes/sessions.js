const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/sessions
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT s.id, s.created_at, s.updated_at,
             COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN messages m ON m.session_id = s.id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `).all();

    return res.json({ sessions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error.' });
  }
});

module.exports = router;
