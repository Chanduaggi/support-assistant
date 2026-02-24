const request = require('supertest');
const app = require('./server');

describe('Support Assistant API', () => {
  const testSessionId = 'test-session-' + Date.now();

  describe('POST /api/chat', () => {
    it('should return 400 if sessionId is missing', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if message is missing', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ sessionId: testSessionId });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for empty message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ sessionId: testSessionId, message: '   ' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/conversations/:sessionId', () => {
    it('should return 404 for unknown session', async () => {
      const res = await request(app)
        .get('/api/conversations/nonexistent-session-xyz');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/sessions', () => {
    it('should return sessions array', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/health', () => {
    it('should return ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
