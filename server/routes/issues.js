import express from 'express';
import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node';
import Issue from '../models/Issue.js';
import { analyzeIssue } from '../controllers/aiController.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const requireAuth = ClerkExpressRequireAuth();

const requireAdmin = async (req, res, next) => {
  try {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    const email = (primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || '').toLowerCase();
    if (!adminEmails.includes(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// POST /api/issues — submit a new issue (citizen)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, location, imageBase64 } = req.body;
    const userId = req.auth.userId;

    const clerkUser = await clerkClient.users.getUser(userId);
    const submitterName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
    const submitterEmail = clerkUser.emailAddresses[0]?.emailAddress || '';

    const aiData = await analyzeIssue(title, description);

    const issue = await Issue.create({
      title,
      description,
      location,
      imageBase64,
      submittedBy: userId,
      submitterName,
      submitterEmail,
      ...aiData,
    });

    res.status(201).json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit issue' });
  }
});

// GET /api/issues/my — citizen's own issues
router.get('/my', requireAuth, async (req, res) => {
  try {
    const issues = await Issue.find({ submittedBy: req.auth.userId }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// GET /api/issues/stats — dashboard stats (admin)
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [total, pending, inProgress, resolved] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'pending' }),
      Issue.countDocuments({ status: 'in-progress' }),
      Issue.countDocuments({ status: 'resolved' }),
    ]);
    res.json({ total, pending, inProgress, resolved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/issues — all issues with optional filters (admin)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, priority, category, sentiment } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (sentiment) filter.sentiment = sentiment;

    const issues = await Issue.find(filter).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// GET /api/issues/:id — single issue
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

// PATCH /api/issues/:id — update status/priority/department/note (admin)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, priority, department, adminNote } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (priority !== undefined) update.priority = priority;
    if (department !== undefined) update.department = department;
    if (adminNote !== undefined) update.adminNote = adminNote;

    const issue = await Issue.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// DELETE /api/issues/:id (admin OR issue owner)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const userId = req.auth.userId;
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(email);
    const isOwner = issue.submittedBy === userId;

    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Not allowed' });

    await issue.deleteOne();
    res.json({ message: 'Issue deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

export default router;
