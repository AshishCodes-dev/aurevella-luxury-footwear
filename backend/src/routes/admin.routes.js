import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/ping', authenticate, authorizeAdmin, (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Admin authenticated',
    admin: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
