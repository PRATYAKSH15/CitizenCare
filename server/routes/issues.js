import express from 'express';
import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import { analyzeIssue } from '../controllers/aiController.js';
import { sendStatusUpdateEmail } from '../controllers/emailController.js';
import { io } from '../server.js';
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

const requireAdminOrDeptAdmin = async (req, res, next) => {
  try {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = (clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || '').toLowerCase();
    if (adminEmails.includes(email)) {
      req.isMainAdmin = true;
      return next();
    }
    const dbUser = await User.findOne({ clerkId: userId });
    if (dbUser?.role === 'dept_admin' && dbUser.department) {
      req.isDeptAdmin = true;
      req.deptAdminDept = dbUser.department;
      return next();
    }
    return res.status(403).json({ error: 'Admin or department admin access required' });
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// POST /api/issues — submit a new issue (citizen)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, location, imageBase64, state } = req.body;
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
      state,
      submittedBy: userId,
      submitterName,
      submitterEmail,
      ...aiData,
    });

    io.to('admins').emit('new_issue', issue);
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

// GET /api/issues/analytics — full analytics data (admin)
router.get('/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [byCategory, bySentiment, byStatus, recentIssues] = await Promise.all([
      Issue.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.aggregate([{ $group: { _id: '$sentiment', count: { $sum: 1 } } }]),
      Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Issue.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
    ]);

    res.json({
      byCategory: byCategory.map(i => ({ name: i._id || 'Other', count: i.count })),
      bySentiment: bySentiment.map(i => ({ name: i._id || 'neutral', count: i.count })),
      byStatus: byStatus.map(i => ({ name: i._id || 'pending', count: i.count })),
      byDate: recentIssues.map(i => ({ date: i._id, count: i.count })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/issues/public — public map data (no auth required)
router.get('/public', async (req, res) => {
  try {
    const issues = await Issue.find()
      .select('title category status priority sentiment location state votes createdAt')
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// GET /api/issues — all issues with optional filters (admin or dept_admin)
router.get('/', requireAuth, requireAdminOrDeptAdmin, async (req, res) => {
  try {
    const { status, priority, category, sentiment } = req.query;
    const filter = {};
    if (req.isDeptAdmin) filter.department = req.deptAdminDept;
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

// GET /api/issues/feed — public community feed (no auth)
router.get('/feed', async (req, res) => {
  try {
    const issues = await Issue.find()
      .select('title description aiSummary category status priority sentiment state location votes submitterName createdAt statusHistory adminNote department')
      .sort({ votes: -1, createdAt: -1 })
      .limit(200);
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// GET /api/issues/search — similar issue detection (no auth)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 4) return res.json([]);
    const issues = await Issue.find({
      title: { $regex: q.trim(), $options: 'i' },
    })
      .select('title category status votes state')
      .limit(3);
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// PATCH /api/issues/bulk — bulk status/priority update (admin)
router.patch('/bulk', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ids, update } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No ids provided' });
    const allowed = {};
    if (update.status) allowed.status = update.status;
    if (update.priority) allowed.priority = update.priority;
    if (update.department) allowed.department = update.department;
    const result = await Issue.updateMany({ _id: { $in: ids } }, { $set: allowed });
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// DELETE /api/issues/bulk — bulk delete (admin)
router.delete('/bulk', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No ids provided' });
    const result = await Issue.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed' });
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

// PATCH /api/issues/:id — update status/priority/department/note (admin or dept_admin)
router.patch('/:id', requireAuth, requireAdminOrDeptAdmin, async (req, res) => {
  try {
    const { status, priority, department, adminNote } = req.body;

    const existing = await Issue.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Issue not found' });

    if (req.isDeptAdmin) {
      if (existing.department !== req.deptAdminDept) {
        return res.status(403).json({ error: 'This issue is not assigned to your department' });
      }
      if (priority !== undefined || department !== undefined) {
        return res.status(403).json({ error: 'Department admins can only update status and notes' });
      }
    }

    const statusChanged = status !== undefined && status !== existing.status;

    const updateOp = { $set: {} };
    if (status !== undefined) updateOp.$set.status = status;
    if (priority !== undefined) updateOp.$set.priority = priority;
    if (department !== undefined) updateOp.$set.department = department;
    if (adminNote !== undefined) updateOp.$set.adminNote = adminNote;

    if (statusChanged) {
      updateOp.$push = { statusHistory: { status, note: adminNote || '', changedAt: new Date() } };
    }

    const issue = await Issue.findByIdAndUpdate(req.params.id, updateOp, { new: true, runValidators: true });

    io.to('admins').emit('issue_updated', issue);

    if (statusChanged) {
      const statusLabel = { pending: 'Pending', 'in-progress': 'In Progress', resolved: 'Resolved' }[status] || status;
      io.to(`user_${existing.submittedBy}`).emit('citizen_notification', {
        message: `Your issue "${existing.title}" is now ${statusLabel}`,
        issueId: issue._id,
        status,
      });
      sendStatusUpdateEmail({
        to: existing.submitterEmail,
        name: existing.submitterName,
        issueTitle: existing.title,
        status,
        adminNote,
      });
    }

    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// POST /api/issues/:id/vote — toggle upvote
router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const hasVoted = issue.voters.includes(userId);
    if (hasVoted) {
      issue.voters = issue.voters.filter(v => v !== userId);
      issue.votes = Math.max(0, issue.votes - 1);
    } else {
      issue.voters.push(userId);
      issue.votes += 1;
    }
    await issue.save();
    res.json({ votes: issue.votes, voted: !hasVoted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/issues/:id/rate — citizen satisfaction rating (issue owner, resolved only)
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: 'Score must be 1–5' });

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    if (issue.submittedBy !== req.auth.userId) return res.status(403).json({ error: 'Not your issue' });
    if (issue.status !== 'resolved') return res.status(400).json({ error: 'Can only rate resolved issues' });
    if (issue.rating?.score) return res.status(400).json({ error: 'Already rated' });

    issue.rating = { score, comment: comment || '', ratedAt: new Date() };
    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// DELETE /api/issues/:id (admin OR issue owner)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const userId = req.auth.userId;
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase();
    const isAdmin = adminEmails.includes(email);
    const isOwner = issue.submittedBy === userId;

    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Not allowed' });

    await issue.deleteOne();
    res.json({ message: 'Issue deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

export default router;
