const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

const TERMINAL_STATUSES = ['cancelled', 'delivered'];

// GET /api/orders - List all orders with optional filter
router.get('/', async (req, res, next) => {
  try {
    const query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.customerPhone) {
      query.customerPhone = req.query.customerPhone;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
      message: `Found ${orders.length} order(s)`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - Get a single order (populated)
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.menuItemId', 'name category price available');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with id ${req.params.id} not found`
      });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    next(err);
  }
});

// POST /api/orders - Create a new order
router.post('/', async (req, res, next) => {
  try {
    const { customerName, customerPhone, deliveryAddress, items, notes } = req.body;

    if (!customerName) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must include at least one item' });
    }

    // Validate and snapshot each item
    const resolvedItems = [];
    let totalAmount = 0;

    for (const orderItem of items) {
      if (!orderItem.menuItemId) {
        return res.status(400).json({ success: false, message: 'Each item must have a menuItemId' });
      }

      const menuItem = await MenuItem.findById(orderItem.menuItemId);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item with id ${orderItem.menuItemId} not found`
        });
      }

      if (!menuItem.available) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${menuItem.name}" is currently not available (épuisé)`
        });
      }

      const qty = parseInt(orderItem.quantity, 10) || 1;

      resolvedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty
      });

      totalAmount += menuItem.price * qty;
    }

    const order = new Order({
      customerName,
      customerPhone: customerPhone || '',
      deliveryAddress: deliveryAddress || '',
      items: resolvedItems,
      totalAmount,
      status: 'pending',
      notes: notes || ''
    });

    await order.save();

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format in request' });
    }
    next(err);
  }
});

// PUT /api/orders/:id - Update an order
router.put('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with id ${req.params.id} not found`
      });
    }

    if (TERMINAL_STATUSES.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update order that is already ${order.status}`
      });
    }

    // Only allow specific fields to be updated
    const allowedUpdates = ['status', 'notes', 'deliveryAddress'];
    const updates = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid update fields provided. Allowed: status, notes, deliveryAddress'
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
});

// DELETE /api/orders/:id - Cancel an order
router.delete('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with id ${req.params.id} not found`
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that has already been delivered'
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    next(err);
  }
});

module.exports = router;
