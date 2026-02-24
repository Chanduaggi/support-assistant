const request = require('supertest');
const app = require('../server');

// Mock LLM module
jest.mock('../llm', () => ({
  getLLMReply: jest.fn().mockResolvedValue({
    reply: 'Users can reset password from Settings > Security.',
    tokensUsed: 42
  })
}));

// Use in-memory DB for tests
process.env.DB_PATH = ':memory:';

describe('API Endpoints', () => {
  const testSessionId = 'test-session-' + Date.now();

  describe('POST /api/chat', () => {
    it('should return 400 if sessionId is missing', async () => {
      const res = await request(app).post('/api/chat').send({ message: 'hello' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if message is missing', async () => {
      const res = await request(app).post('/api/chat').send({ sessionId: testSessionId });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return reply and tokensUsed on valid request', async () => {
      const res = await request(app).post('/api/chat').send({
        sessionId: testSessionId,
        message: 'How do I reset my password?'
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reply');
      expect(res.body).toHaveProperty('tokensUsed');
    });
  });

  describe('GET /api/conversations/:sessionId', () => {
    it('should return messages for existing session', async () => {
      const res = await request(app).get(`/api/conversations/${testSessionId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('should return empty messages for unknown session', async () => {
      const res = await request(app).get('/api/conversations/nonexistent-session');
      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(0);
    });
  });

  describe('GET /api/sessions', () => {
    it('should return list of sessions', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sessions');
      expect(Array.isArray(res.body.sessions)).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
