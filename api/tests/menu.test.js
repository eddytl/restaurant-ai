require('./setup');
const request = require('supertest');
const app = require('../server');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

let category;

beforeEach(async () => {
  category = await Category.create({ name: 'SALADES' });
  await MenuItem.create([
    { idx: 1, name: 'Salade César', price: 2500, category: category._id, available: true },
    { idx: 2, name: 'Salade Niçoise', price: 3000, category: category._id, available: false },
    { idx: 3, name: 'Burger BBQ', price: 4500, category: category._id, available: true }
  ]);
});

describe('GET /api/menu', () => {
  it('returns all menu items', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/menu?category=SALADES');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('filters available items only', async () => {
    const res = await request(app).get('/api/menu?available=true');
    expect(res.status).toBe(200);
    expect(res.body.data.every((i) => i.available)).toBe(true);
  });
});

describe('GET /api/menu/by-idx/:idx', () => {
  it('returns item by idx', async () => {
    const res = await request(app).get('/api/menu/by-idx/1');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Salade César');
  });

  it('returns 404 for unknown idx', async () => {
    const res = await request(app).get('/api/menu/by-idx/999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid idx', async () => {
    const res = await request(app).get('/api/menu/by-idx/abc');
    expect(res.status).toBe(400);
  });
});
