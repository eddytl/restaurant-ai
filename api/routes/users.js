const router = require('express').Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const [users, total] = await Promise.all([
      User.find({}, '-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments()
    ]);
    res.json({ success: true, data: users, page, limit, total });
  } catch (err) { next(err); }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nom, email et mot de passe requis' });
    }
    const user = new User({ name, email, password, role: role || 'user' });
    await user.save();
    const { password: _pw, ...data } = user.toObject();
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    }
    next(err);
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    if (name)  user.name  = name;
    if (email) user.email = email;
    if (role)  user.role  = role;
    if (password) user.password = password; // triggers bcrypt pre-save hook

    await user.save();
    const { password: _pw, ...data } = user.toObject();
    res.json({ success: true, data });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    }
    next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    // Prevent deleting yourself
    if (req.user.id === req.params.id) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (err) { next(err); }
});

module.exports = router;
