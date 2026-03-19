const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// GET / - list conversations for a client (sidebar)
router.get('/', async (req, res, next) => {
  try {
    const clientId = req.headers['x-client-id'];
    const query = clientId ? { clientId } : {};
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const conversations = await Conversation.find(query)
      .select('sessionId title createdAt updatedAt uiMessages')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Conversation.countDocuments(query);
    res.json({ success: true, data: conversations, page, limit, total });
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
    const { sessionId, title, apiMessages, uiMessages, clientId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required' });

    const update = { title, apiMessages, uiMessages };
    if (clientId) update.clientId = clientId;

    const conv = await Conversation.findOneAndUpdate(
      { sessionId },
      update,
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

// DELETE /:sessionId - delete a conversation (only owner can delete)
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const clientId = req.headers['x-client-id'];
    const query = { sessionId: req.params.sessionId };
    if (clientId) query.clientId = clientId;
    await Conversation.deleteOne(query);
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
