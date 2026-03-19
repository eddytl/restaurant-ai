const router = require('express').Router();
const Branch = require('../models/Branch');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/branches — public (agent + admin UI)
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';
    const branches = await Branch.find(filter).sort({ name: 1 });
    res.json({ success: true, data: branches, total: branches.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/branches/:id
router.get('/:id', async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
});

// POST /api/branches — admin only
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, address, city, phone, email, isActive } = req.body;
    if (!name || !address || !city) {
      return res.status(400).json({ success: false, message: 'Nom, adresse et ville sont requis' });
    }
    const branch = await Branch.create({ name, address, city, phone, email, isActive });
    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
});

// PUT /api/branches/:id — admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, address, city, phone, email, isActive } = req.body;
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { $set: { name, address, city, phone, email, isActive } },
      { new: true, runValidators: true }
    );
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/branches/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.json({ success: true, message: 'Agence supprimée' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
