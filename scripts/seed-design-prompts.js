const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define the User schema (simplified for seeding)
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
    select: false,
    trim: true,
  },
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Define the SystemPrompt schema
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
    default: 'design',
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

const SystemPrompt = mongoose.models.SystemPrompt || mongoose.model('SystemPrompt', SystemPromptSchema);

// Design analysis prompts
const designPrompts = [
  {
    name: "Design System Analyzer",
    description: "Analyzes UI screenshots and extracts design tokens into CSS variables",
    prompt: `Analyze this UI screenshot and extract design tokens into CSS variables. 

Return a JSON object with the following structure:
{
  "cssVariables": ":root { /* CSS variables here */ }",
  "analysisResult": "Detailed analysis of the design system"
}

Guidelines for CSS variables:
- Extract primary, secondary, and accent colors
- Identify typography scales (font sizes, line heights, font weights)
- Extract spacing values (padding, margins, gaps)
- Identify border radius values
- Extract shadow values
- Use semantic naming (e.g., --primary-color, --text-lg, --spacing-md)
- Include both light and dark theme variables if applicable
- Use standard CSS units (rem, px, em)

Analysis should include:
- Color palette analysis
- Typography system
- Spacing system
- Component patterns
- Design principles observed

Return only valid JSON, no additional text.`,
    category: "design",
    isActive: true,
  },
  {
    name: "Brand Design Extractor",
    description: "Extracts brand colors and design elements from brand materials",
    prompt: `Analyze this brand design screenshot and extract brand-specific design tokens.

Return a JSON object with the following structure:
{
  "cssVariables": ":root { /* Brand CSS variables */ }",
  "analysisResult": "Brand design analysis"
}

Focus on:
- Brand colors (primary, secondary, accent)
- Logo colors and variations
- Typography hierarchy
- Brand-specific spacing
- Icon styles and colors
- Brand personality indicators

Use brand-specific naming (e.g., --brand-primary, --logo-color)

Return only valid JSON, no additional text.`,
    category: "design",
    isActive: true,
  },
  {
    name: "Component Library Analyzer",
    description: "Analyzes component libraries and design systems",
    prompt: `Analyze this component library screenshot and extract reusable design tokens.

Return a JSON object with the following structure:
{
  "cssVariables": ":root { /* Component CSS variables */ }",
  "analysisResult": "Component library analysis"
}

Focus on:
- Button styles and variants
- Form element styles
- Card and container styles
- Navigation components
- Interactive states (hover, focus, active)
- Component spacing and sizing
- Icon integration patterns

Use component-specific naming (e.g., --btn-primary, --card-shadow)

Return only valid JSON, no additional text.`,
    category: "design",
    isActive: true,
  }
];

async function seedDesignPrompts() {
  try {
    console.log('Starting to seed design prompts...');
    
    // Get the first user (assuming there's at least one user)
    const firstUser = await User.findOne();
    
    if (!firstUser) {
      console.log('No users found. Please create a user first.');
      process.exit(1);
    }

    for (const promptData of designPrompts) {
      // Check if prompt already exists
      const existingPrompt = await SystemPrompt.findOne({ name: promptData.name });
      
      if (existingPrompt) {
        console.log(`Prompt "${promptData.name}" already exists, skipping...`);
        continue;
      }

      // Create new prompt
      const newPrompt = new SystemPrompt({
        ...promptData,
        createdBy: firstUser._id,
      });

      await newPrompt.save();
      console.log(`Created prompt: ${promptData.name}`);
    }

    console.log('Design prompts seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding design prompts:', error);
    process.exit(1);
  }
}

seedDesignPrompts(); 