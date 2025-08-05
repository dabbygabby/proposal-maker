const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/proposal-maker');

// Define the SystemPrompt schema (same as in the model)
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
    enum: ['general', 'presentation', 'document', 'custom'],
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

// Default system prompts
const defaultPrompts = [
  {
    name: "PowerPoint Presentation Generator",
    description: "Default prompt for converting text into structured PowerPoint JSON",
    prompt: `Analyze the following text and convert it into a structured JSON format suitable for creating a PowerPoint presentation. 

The JSON should have this exact structure:
{
  "presentationTitle": "A descriptive title for the presentation",
  "totalSlides": number,
  "slides": [
    {
      "id": "unique-id",
      "title": "Slide title",
      "content": "Main content text",
      "type": "title|content|bullet|image|mixed",
      "bullets": ["bullet point 1", "bullet point 2"] // only if type is bullet or mixed
      "imagePlaceholder": "Description of image to be added" // only if type is image or mixed
    }
  ]
}

Guidelines:
- Create logical slide breaks based on topics, sections, or natural content flow
- Use 'title' type for slide titles and introductions
- Use 'content' type for text-heavy slides with paragraphs
- Use 'bullet' type for slides with bullet points
- Use 'image' type when visual content would enhance the slide
- Use 'mixed' type for slides with both text and visual elements
- Include image placeholders when visual content would be beneficial
- Ensure each slide has a clear, descriptive title
- Make content concise but informative
- Structure content logically for presentation flow

Text to analyze:
{text}

Return only valid JSON, no additional text or explanations.`,
    category: "presentation",
    isActive: true,
  },
  {
    name: "Business Presentation Generator",
    description: "Specialized prompt for business presentations with executive summary",
    prompt: `Convert the following text into a business presentation JSON structure with executive summary and key insights.

The JSON should have this exact structure:
{
  "presentationTitle": "Business-focused title",
  "totalSlides": number,
  "slides": [
    {
      "id": "unique-id",
      "title": "Slide title",
      "content": "Main content text",
      "type": "title|content|bullet|image|mixed",
      "bullets": ["bullet point 1", "bullet point 2"] // only if type is bullet or mixed
      "imagePlaceholder": "Description of image to be added" // only if type is image or mixed
    }
  ]
}

Guidelines:
- Start with an executive summary slide
- Include key metrics and data points
- Use bullet points for easy scanning
- Include action items and next steps
- Add visual placeholders for charts and graphs
- Focus on business impact and ROI
- Keep slides concise and professional
- Structure for executive audience

Text to analyze:
{text}

Return only valid JSON, no additional text or explanations.`,
    category: "presentation",
    isActive: true,
  },
  {
    name: "Educational Presentation Generator",
    description: "Specialized prompt for educational content with learning objectives",
    prompt: `Convert the following text into an educational presentation JSON structure with learning objectives and interactive elements.

The JSON should have this exact structure:
{
  "presentationTitle": "Educational title",
  "totalSlides": number,
  "slides": [
    {
      "id": "unique-id",
      "title": "Slide title",
      "content": "Main content text",
      "type": "title|content|bullet|image|mixed",
      "bullets": ["bullet point 1", "bullet point 2"] // only if type is bullet or mixed
      "imagePlaceholder": "Description of image to be added" // only if type is image or mixed
    }
  ]
}

Guidelines:
- Start with learning objectives
- Include concept explanations with examples
- Add interactive elements and questions
- Use visual aids for complex concepts
- Include summary and review slides
- Structure for student engagement
- Add practice exercises where appropriate
- Include assessment questions

Text to analyze:
{text}

Return only valid JSON, no additional text or explanations.`,
    category: "presentation",
    isActive: true,
  }
];

async function seedSystemPrompts() {
  try {
    console.log('Starting to seed system prompts...');
    
    // Get the first user as the creator (you may need to adjust this)
    const User = mongoose.model('User');
    const firstUser = await User.findOne();
    
    if (!firstUser) {
      console.log('No users found. Please create a user first.');
      process.exit(1);
    }
    
    for (const promptData of defaultPrompts) {
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
    
    console.log('System prompts seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding system prompts:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedSystemPrompts(); 