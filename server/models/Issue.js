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
  submittedBy: { type: String, required: true },
  submitterName: { type: String },
  submitterEmail: { type: String },
}, { timestamps: true });

export default mongoose.model('Issue', issueSchema);
