const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// GET /api/customers - List all customers
router.get('/', async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ lastOrderAt: -1 });
    res.json({ success: true, data: customers, message: `Found ${customers.length} customer(s)` });
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
