const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES = '7d';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    }
    const user = await User.findOne({ email }).populate('branch', 'name city');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role, branch: user.branch?._id || null },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, branch: user.branch || null }
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = router;
