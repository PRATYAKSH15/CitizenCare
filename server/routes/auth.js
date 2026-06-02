import express from 'express';
import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const requireAuth = ClerkExpressRequireAuth();

const requireAdmin = async (req, res, next) => {
  try {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = (clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || '').toLowerCase();
    if (!adminEmails.includes(email)) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// POST /api/auth/sync — upsert user doc on sign-in, returns role + department
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const clerkUser = await clerkClient.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId);
    const email = (primaryEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || '').toLowerCase();
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: { email, name }, $setOnInsert: { role: 'citizen', department: null } },
      { upsert: true, new: true }
    );
    res.json({ role: user.role, department: user.department || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// GET /api/auth/users — all synced users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/auth/users/:id — assign/remove dept_admin role (admin only)
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, department } = req.body;
    const update = {};
    if (role !== undefined) update.role = role;
    if (role === 'citizen') update.department = null;
    else if (department !== undefined) update.department = department;

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
