require('./setup');
const request = require('supertest');
const app = require('../server');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

let item;

beforeEach(async () => {
  const cat = await Category.create({ name: 'BURGER' });
  item = await MenuItem.create({ idx: 1, name: 'Burger BBQ', price: 4500, category: cat._id, available: true });
});

const validOrder = () => ({
  customerName: 'Alice',
  customerPhone: '655000001',
  items: [{ menuItemId: item._id.toString(), quantity: 2 }]
});

describe('POST /api/orders', () => {
  it('creates an order successfully', async () => {
    const res = await request(app).post('/api/orders').send(validOrder());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAmount).toBe(9000);
    expect(res.body.data.status).toBe('pending');
  });

  it('requires customerName', async () => {
    const { customerName, ...body } = validOrder();
    const res = await request(app).post('/api/orders').send(body);
    expect(res.status).toBe(400);
  });

  it('requires customerPhone', async () => {
    const { customerPhone, ...body } = validOrder();
    const res = await request(app).post('/api/orders').send(body);
    expect(res.status).toBe(400);
  });

  it('rejects unavailable menu item', async () => {
    const cat = await Category.create({ name: 'SALADES' });
    const unavail = await MenuItem.create({ idx: 2, name: 'Épuisé', price: 1000, category: cat._id, available: false });
    const res = await request(app).post('/api/orders').send({
      ...validOrder(),
      items: [{ menuItemId: unavail._id.toString(), quantity: 1 }]
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not available/i);
  });
});

describe('GET /api/orders', () => {
  beforeEach(async () => {
    await request(app).post('/api/orders').send(validOrder());
    await request(app).post('/api/orders').send({ ...validOrder(), customerPhone: '655000002' });
  });

  it('returns paginated orders', async () => {
    const res = await request(app).get('/api/orders?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
  });

  it('filters by customerPhone', async () => {
    const res = await request(app).get('/api/orders?customerPhone=655000001');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('DELETE /api/orders/:id (cancel)', () => {
  it('cancels a pending order', async () => {
    const create = await request(app).post('/api/orders').send(validOrder());
    const orderId = create.body.data._id;
    const res = await request(app).delete(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('cannot cancel an already-cancelled order', async () => {
    const create = await request(app).post('/api/orders').send(validOrder());
    const orderId = create.body.data._id;
    await request(app).delete(`/api/orders/${orderId}`);
    const res = await request(app).delete(`/api/orders/${orderId}`);
    expect(res.status).toBe(400);
  });
});
