const express = require('express');
const router = express.Router();
const Media = require('../models/Media');

// GET /api/media/:id — find by ObjectId
router.get('/:id', async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid media ID format' });
    }
    next(err);
  }
});

module.exports = router;
