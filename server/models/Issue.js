import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String },
  imageBase64: { type: String },
  category: { type: String, default: 'Other' },
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'neutral' },
  aiSummary: { type: String },
  status: { type: String, enum: ['pending', 'in-progress', 'resolved'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  department: { type: String },
  adminNote: { type: String },
  state: { type: String },
  votes: { type: Number, default: 0 },
  voters: [{ type: String }],
  statusHistory: [{
    status: { type: String },
    note: { type: String },
    changedAt: { type: Date, default: Date.now },
  }],
  rating: {
    score: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    ratedAt: { type: Date },
  },
  submittedBy: { type: String, required: true },
  submitterName: { type: String },
  submitterEmail: { type: String },
}, { timestamps: true });

export default mongoose.model('Issue', issueSchema);
