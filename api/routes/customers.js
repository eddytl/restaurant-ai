const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// GET /api/customers - List all customers with pagination and optional search
router.get('/', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const query = {};
    if (req.query.search) {
      const re = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ name: re }, { phone: re }];
    }
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ lastOrderAt: -1 }).skip((page - 1) * limit).limit(limit),
      Customer.countDocuments(query)
    ]);
    res.json({ success: true, data: customers, page, limit, total, message: `Found ${total} customer(s)` });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:phone - Get customer by phone
router.get('/:phone', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ phone: req.params.phone }).populate('orders');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
