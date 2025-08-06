import mongoose from 'mongoose';

const SystemPromptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the prompt'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true,
  },
  prompt: {
    type: String,
    required: [true, 'Please provide the system prompt'],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    default: 'general',
    enum: ['general', 'presentation', 'document', 'custom', 'design'],
  },
  version: {
    type: Number,
    default: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Check if model exists, if not create it
const SystemPrompt = mongoose.models.SystemPrompt || mongoose.model('SystemPrompt', SystemPromptSchema);

export default SystemPrompt; 