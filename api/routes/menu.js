const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Media = require('../models/Media');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `menu-${req.params.id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(allowed.includes(ext) ? null : new Error('Only JPG, PNG and WebP images are allowed'), allowed.includes(ext));
  }
});

// GET /api/menu - List all menu items with optional filters
router.get('/', async (req, res, next) => {
  try {
    const query = {};

    if (req.query.category) {
      const cat = await Category.findOne({ name: req.query.category.toUpperCase() });
      if (!cat) return res.json({ success: true, data: [], message: 'Found 0 menu item(s)' });
      query.category = cat._id;
    }

    if (req.query.name) {
      query.name = { $regex: new RegExp(`^${req.query.name.trim()}$`, 'i') };
    }

    if (req.query.available !== undefined) {
      query.available = req.query.available === 'true';
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const [items, total] = await Promise.all([
      MenuItem.find(query).populate('category', 'name').populate('media', 'url alt').sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      MenuItem.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: items,
      page, limit, total,
      message: `Found ${total} menu item(s)`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/by-idx/:idx - Get a single menu item by its integer idx
router.get('/by-idx/:idx', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx);
    if (isNaN(idx)) return res.status(400).json({ success: false, message: 'Invalid idx' });
    const item = await MenuItem.findOne({ idx }).populate('category', 'name').populate('media', 'url alt');
    if (!item) return res.status(404).json({ success: false, message: `Menu item idx ${idx} not found` });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/:id - Get a single menu item
router.get('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id).populate('category', 'name').populate('media', 'url alt');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item with id ${req.params.id} not found`
      });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID format' });
    }
    next(err);
  }
});

// POST /api/menu - Create a new menu item
router.post('/', async (req, res, next) => {
  try {
    const item = new MenuItem(req.body);
    await item.save();

    res.status(201).json({
      success: true,
      data: item,
      message: 'Menu item created successfully'
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
});

// PUT /api/menu/:id - Update a menu item
router.put('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item with id ${req.params.id} not found`
      });
    }

    res.json({
      success: true,
      data: item,
      message: 'Menu item updated successfully'
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID format' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
});

// POST /api/menu/:id/image - Upload image for a menu item (creates a Media doc)
router.post('/:id/image', upload.single('image'), async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    // Delete old media doc and file if local upload
    if (item.media) {
      const oldMedia = await Media.findById(item.media);
      if (oldMedia && oldMedia.url.startsWith('/uploads/')) {
        const oldPath = path.join(UPLOADS_DIR, path.basename(oldMedia.url));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      await Media.findByIdAndDelete(item.media);
    }

    const media = await Media.create({ url: `/uploads/${req.file.filename}`, alt: item.name });
    item.media = media._id;
    await item.save();

    res.json({ success: true, data: { ...item.toObject(), media }, message: 'Image uploaded successfully' });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    next(err);
  }
});

// DELETE /api/menu/:id/image - Remove image from a menu item
router.delete('/:id/image', async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });

    if (item.media) {
      const oldMedia = await Media.findById(item.media);
      if (oldMedia && oldMedia.url.startsWith('/uploads/')) {
        const imgPath = path.join(UPLOADS_DIR, path.basename(oldMedia.url));
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
      await Media.findByIdAndDelete(item.media);
      item.media = null;
      await item.save();
    }

    res.json({ success: true, data: item, message: 'Image removed' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu/:id - Delete a menu item
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item with id ${req.params.id} not found`
      });
    }

    res.json({
      success: true,
      data: item,
      message: 'Menu item deleted successfully'
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID format' });
    }
    next(err);
  }
});

module.exports = router;
