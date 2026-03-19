require('./setup');
const request = require('supertest');
const app = require('../server');

const CLIENT_A = 'client-aaa';
const CLIENT_B = 'client-bbb';

beforeEach(async () => {
  await request(app).post('/api/conversations').send({ sessionId: 's1', title: 'Conv 1', clientId: CLIENT_A, apiMessages: [], uiMessages: [] });
  await request(app).post('/api/conversations').send({ sessionId: 's2', title: 'Conv 2', clientId: CLIENT_A, apiMessages: [], uiMessages: [] });
  await request(app).post('/api/conversations').send({ sessionId: 's3', title: 'Conv 3', clientId: CLIENT_B, apiMessages: [], uiMessages: [] });
});

describe('GET /api/conversations', () => {
  it('returns all conversations when no clientId header', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
  });

  it('filters by X-Client-Id', async () => {
    const res = await request(app).get('/api/conversations').set('X-Client-Id', CLIENT_A);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.total).toBe(2);
  });

  it('paginates correctly', async () => {
    const res = await request(app).get('/api/conversations?page=1&limit=1').set('X-Client-Id', CLIENT_A);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
  });
});

describe('DELETE /api/conversations/:sessionId', () => {
  it('owner can delete their conversation', async () => {
    const res = await request(app).delete('/api/conversations/s1').set('X-Client-Id', CLIENT_A);
    expect(res.status).toBe(200);
    const list = await request(app).get('/api/conversations').set('X-Client-Id', CLIENT_A);
    expect(list.body.data.length).toBe(1);
  });

  it('other client cannot delete someone else\'s conversation', async () => {
    await request(app).delete('/api/conversations/s1').set('X-Client-Id', CLIENT_B);
    // s1 still exists for CLIENT_A
    const list = await request(app).get('/api/conversations').set('X-Client-Id', CLIENT_A);
    expect(list.body.data.length).toBe(2);
  });
});

describe('PATCH /api/conversations/:sessionId/rename', () => {
  it('renames a conversation', async () => {
    const res = await request(app).patch('/api/conversations/s1/rename').send({ title: 'Nouveau titre' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Nouveau titre');
  });

  it('rejects empty title', async () => {
    const res = await request(app).patch('/api/conversations/s1/rename').send({ title: '' });
    expect(res.status).toBe(400);
  });
});
