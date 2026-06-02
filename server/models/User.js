import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['citizen', 'dept_admin'], default: 'citizen' },
  department: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
