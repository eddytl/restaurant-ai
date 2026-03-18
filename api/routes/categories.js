const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, data: categories, message: `Found ${categories.length} category(ies)` });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }
    next(err);
  }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    const category = new Category({ name });
    await category.save();
    res.status(201).json({ success: true, data: category, message: 'Category created' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: `Category '${req.body.name}' already exists` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
    }
    next(err);
  }
});

// PATCH /api/categories/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: { name } },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category, message: 'Category updated' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: `Category '${req.body.name}' already exists` });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: `Category '${category.name}' deleted` });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }
    next(err);
  }
});

module.exports = router;
