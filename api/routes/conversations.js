const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// GET / - list all conversations (sidebar)
router.get('/', async (req, res, next) => {
  try {
    const conversations = await Conversation.find({})
      .select('sessionId title updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json({ success: true, data: conversations });
  } catch (err) { next(err); }
});

// GET /:sessionId - get full conversation
router.get('/:sessionId', async (req, res, next) => {
  try {
    const conv = await Conversation.findOne({ sessionId: req.params.sessionId });
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, data: conv });
  } catch (err) { next(err); }
});

// POST / - create or update (upsert) a conversation
router.post('/', async (req, res, next) => {
  try {
    const { sessionId, title, apiMessages, uiMessages } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required' });

    const conv = await Conversation.findOneAndUpdate(
      { sessionId },
      { title, apiMessages, uiMessages },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: conv });
  } catch (err) { next(err); }
});

// PATCH /:sessionId/rename - rename a conversation
router.patch('/:sessionId/rename', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'title is required' });
    const conv = await Conversation.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { title: title.trim() },
      { new: true }
    );
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, data: conv });
  } catch (err) { next(err); }
});

// DELETE /:sessionId - delete a conversation
router.delete('/:sessionId', async (req, res, next) => {
  try {
    await Conversation.deleteOne({ sessionId: req.params.sessionId });
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
