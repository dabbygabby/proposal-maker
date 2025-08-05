import mongoose, { Document } from 'mongoose';

export interface IProposal extends Document {
  name: string;
  html: string;
  shareableLink: string;
  user: mongoose.Schema.Types.ObjectId;
  views: number;
  viewDetails: {
    ip: string;
    location: string;
    timestamp: Date;
  }[];
}

const ProposalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  html: {
    type: String,
    required: [true, 'Please provide HTML content'],
  },
  shareableLink: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  viewDetails: [{
    ip: String,
    location: String,
    timestamp: Date,
  }],
}, {
  timestamps: true,
});

const Proposal = mongoose.models.Proposal || mongoose.model<IProposal>('Proposal', ProposalSchema);

export default Proposal;
