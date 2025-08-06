import mongoose from 'mongoose';

const DesignLibrarySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the design library'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true,
  },
  cssVariables: {
    type: String,
    required: [true, 'CSS variables are required'],
    trim: true,
    default: '',
  },
  analysisResult: {
    type: String,
    required: [true, 'Analysis result is required'],
    trim: true,
    default: '',
  },
  systemPromptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SystemPrompt',
    required: true,
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
const DesignLibrary = mongoose.models.DesignLibrary || mongoose.model('DesignLibrary', DesignLibrarySchema);

export default DesignLibrary; 