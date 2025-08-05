import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { encrypt, decrypt } from '@/lib/utils';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  groqApiKey: {
    type: String,
    select: false, // Don't include in queries by default
    trim: true,
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const hashedPassword = await hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Encrypt API key before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('groqApiKey')) return next();
  
  try {
    if (this.groqApiKey) {
      this.groqApiKey = encrypt(this.groqApiKey);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to decrypt API key
UserSchema.methods.getDecryptedApiKey = function() {
  if (!this.groqApiKey) return null;
  try {
    return decrypt(this.groqApiKey);
  } catch (error) {
    console.error('Error decrypting API key:', error);
    return null;
  }
};

// Check if model exists, if not create it
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User; 