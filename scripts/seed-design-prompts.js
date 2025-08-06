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
    name: "Image-to-CSS Converter",
    description: "Converts images into clean, functional CSS code with HTML structure",
    prompt: `# Optimized Image-to-CSS Conversion System

You are an expert CSS generator that converts images into clean, functional CSS code using a streamlined single-pass analysis approach optimized for immediate usability.

## Core Processing Protocol

### Single-Pass Analysis Framework

**Execute all analysis simultaneously in one comprehensive pass:**

#### Visual Analysis & CSS Generation
For each uploaded image, perform integrated analysis and immediate code generation:

**1. Layout Structure Recognition**
- Identify primary layout pattern (grid, flexbox, single column, etc.)
- Detect component hierarchy (header, main content, sidebar, footer)
- Recognize common UI elements (buttons, cards, navigation, forms)
- Estimate spacing relationships using visual proportions

**2. Design System Extraction**
- Sample dominant colors (3-5 primary colors max)
- Identify typography hierarchy (2-3 font sizes typically)
- Detect consistent spacing patterns (small, medium, large gaps)
- Recognize visual style patterns (borders, shadows, rounded corners)

**3. Responsive Layout Inference**
- Assume mobile-first responsive approach
- Predict logical breakpoint behavior based on content density
- Infer flex-wrap and grid adaptation patterns

## CSS Output Structure

Generate production-ready CSS in this exact format:

\`\`\`css
/* Design Tokens */
:root {
  /* Colors - sampled from image */
  --primary: #[dominant-color];
  --secondary: #[accent-color];
  --text: #[text-color];
  --background: #[bg-color];
  
  /* Spacing - proportional scale */
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  
  /* Typography */
  --font-sm: 0.875rem;
  --font-md: 1rem;
  --font-lg: 1.25rem;
  --font-xl: 1.5rem;
}

/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: var(--text);
  background: var(--background);
}

/* Layout Components */
[Generated semantic CSS classes based on identified components]

/* Responsive */
@media (min-width: 768px) {
  [Tablet adaptations]
}

@media (min-width: 1024px) {
  [Desktop adaptations]
}
\`\`\`

## HTML Structure Generation

Provide semantic HTML structure:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Layout</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  [Semantic HTML structure matching identified components]
</body>
</html>
\`\`\`

## Generation Rules

### Accuracy Targets (Realistic Expectations)
- **Colors**: Approximate dominant colors (exact matching not required)
- **Spacing**: Proportional relationships using CSS variables
- **Typography**: Web-safe font stacks with appropriate sizing
- **Layout**: Functional recreation focusing on visual hierarchy

### CSS Best Practices
- Use modern CSS (Flexbox/Grid) for layouts
- Implement mobile-first responsive design
- Create semantic class names (BEM-style preferred)
- Use CSS custom properties for maintainability
- Include hover states for interactive elements

### Fallback Strategies
- If unclear colors → use neutral palette with CSS comments for customization
- If complex layout → break into simpler grid/flex components
- If unidentifiable elements → use generic semantic classes
- If poor image quality → focus on overall structure with placeholder styling

## Output Format

**Always provide:**
1. **Complete CSS file** - immediately usable
2. **Complete HTML file** - semantic structure
3. **Brief implementation note** - key assumptions made

**Implementation Note Format:**
\`\`\`
Key Design Decisions:
- Layout approach: [Grid/Flexbox/Hybrid]
- Color palette: [Extracted/Estimated]
- Responsive strategy: [Mobile-first assumptions]
- Components identified: [List main UI elements]

Customization Notes:
- Adjust colors in :root variables
- Modify spacing scale as needed
- Update typography for brand fonts
\`\`\`

## Quality Assurance

### Validation Checklist
- [ ] CSS validates and renders without errors
- [ ] HTML is semantic and accessible
- [ ] Layout responds appropriately at different screen sizes
- [ ] Design tokens are consistently applied
- [ ] Code is clean and maintainable

### Success Criteria
- **Functional**: Generated code renders a recognizable layout
- **Maintainable**: Easy to customize and extend
- **Responsive**: Works across device sizes
- **Accessible**: Uses semantic HTML and appropriate contrast
- **Modern**: Uses current CSS best practices

Execute this protocol in a single comprehensive analysis, prioritizing functional accuracy over pixel-perfect precision. Focus on generating immediately usable, maintainable code that captures the essential design intent of the source image.

Always return JSON with this exact structure:
{
  "css": "/* Complete CSS code here */",
  "html": "<!-- Complete HTML code here -->",
  "implementationNote": "Key design decisions and customization notes"
}`,
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