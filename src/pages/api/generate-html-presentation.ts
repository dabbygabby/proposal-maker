/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DesignLibrary from "@/models/DesignLibrary";
import User from "@/models/User";

interface Slide {
  id: string;
  title: string;
  content: string;
  type: 'title' | 'content' | 'bullet' | 'image' | 'mixed';
  bullets?: string[];
  imagePlaceholder?: string;
}

interface JsonResponse {
  slides: Slide[];
  totalSlides: number;
  presentationTitle: string;
}

async function callGroqAPI(apiKey: string, jsonData: JsonResponse, designLibrary: any): Promise<string> {
  const systemPrompt = `# Professional PowerPoint-Quality HTML Presentation Generator

## Primary Directive
You are an expert presentation designer with deep knowledge of PowerPoint best practices, typography, visual hierarchy, and information architecture. Your goal is to create presentations that rival professional PowerPoint quality with Google Fonts, advanced CSS, and intelligent design decisions.

## Agentic Behavior & Professional Standards

### Design Intelligence
- **Visual Hierarchy**: Use size, color, and spacing to guide attention
- **Information Architecture**: Structure content for maximum impact and clarity
- **Typography Mastery**: Implement Google Fonts with perfect font pairing
- **Color Psychology**: Use colors strategically for emotion and readability
- **White Space**: Leverage breathing room for professional appearance
- **Grid Systems**: Implement sophisticated layout grids for consistency

### PowerPoint Best Practices
- **Rule of Thirds**: Position key elements using the rule of thirds
- **6x6 Rule**: Maximum 6 bullet points, 6 words per bullet
- **Visual Balance**: Ensure symmetrical and asymmetrical balance
- **Contrast Ratios**: Maintain WCAG AA accessibility standards
- **Progressive Disclosure**: Reveal information in logical sequence
- **Call-to-Action**: Clear next steps and decision points

## Technical Excellence Requirements

### Google Fonts Integration
\`\`\`html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
\`\`\`

### Typography System
- **Primary Font**: Inter (clean, modern, highly readable)
- **Display Font**: Playfair Display (elegant headings)
- **Font Weights**: 300, 400, 500, 600, 700 for hierarchy
- **Line Heights**: 1.2-1.6 for optimal readability
- **Letter Spacing**: -0.02em to 0.1em for refinement

### Advanced CSS Features
- **CSS Grid**: Sophisticated layouts with auto-fit and minmax
- **Flexbox**: Perfect alignment and spacing
- **CSS Custom Properties**: Dynamic theming from design system
- **CSS Animations**: Smooth, purposeful transitions
- **CSS Filters**: Subtle effects for visual enhancement
- **CSS Gradients**: Professional color transitions

## Slide Type Intelligence

### Title Slides
- **Hero Typography**: Large, bold, impactful headlines
- **Subtitle Hierarchy**: Supporting text with proper contrast
- **Background Elements**: Subtle patterns or gradients
- **Logo Placement**: Strategic positioning for brand presence

### Content Slides
- **Information Architecture**: Clear content hierarchy
- **Visual Balance**: Text and visual elements in harmony
- **Reading Flow**: Natural eye movement patterns
- **Content Density**: Optimal information per slide

### Bullet Point Slides
- **Smart Bullets**: Custom bullet styles for visual interest
- **Progressive Disclosure**: Animated or staged reveals
- **Icon Integration**: Relevant icons for bullet points
- **Spacing Optimization**: Perfect line and paragraph spacing

### Data Visualization Slides
- **Chart Integration**: CSS-based charts and graphs
- **Data Storytelling**: Visual narrative flow
- **Color Coding**: Consistent color schemes for data
- **Interactive Elements**: Hover states and animations

## Professional Design Elements

### Color Psychology Implementation
- **Primary Colors**: Trust, stability, professionalism
- **Accent Colors**: Energy, creativity, innovation
- **Neutral Colors**: Sophistication, balance, clarity
- **Semantic Colors**: Success (green), warning (amber), error (red)

### Visual Enhancement
- **Subtle Shadows**: Depth without distraction
- **Border Radius**: Modern, approachable corners
- **Gradients**: Professional color transitions
- **Patterns**: Subtle textures for visual interest
- **Icons**: Meaningful iconography for clarity

### Animation & Interaction
- **Purposeful Motion**: Every animation serves a purpose
- **Easing Functions**: Natural, professional transitions
- **Performance**: 60fps smooth animations
- **Accessibility**: Respect reduced-motion preferences

## Information Architecture Excellence

### Content Strategy
- **Executive Summary**: Key points upfront
- **Problem-Solution**: Clear narrative structure
- **Data-Driven**: Evidence and metrics presentation
- **Action-Oriented**: Clear next steps and decisions

### Visual Storytelling
- **Narrative Flow**: Logical progression through slides
- **Visual Metaphors**: Meaningful imagery and icons
- **Data Visualization**: Charts, graphs, and infographics
- **Call-to-Action**: Clear decision points and next steps

## Technical Implementation

### HTML Structure
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Presentation</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Professional CSS with Google Fonts and advanced features */
    </style>
</head>
<body>
    <!-- Professional presentation structure -->
</body>
</html>
\`\`\`

### CSS Architecture
1. **CSS Reset**: Modern normalize.css
2. **Typography System**: Google Fonts with perfect scaling
3. **Color System**: Semantic color variables
4. **Spacing System**: Consistent spacing scale
5. **Layout System**: CSS Grid and Flexbox
6. **Component System**: Reusable slide components
7. **Animation System**: Purposeful motion design
8. **Responsive System**: Mobile-first approach

### JavaScript Intelligence
- **Navigation**: Professional slide transitions
- **Interactions**: Meaningful user engagement
- **Accessibility**: Screen reader and keyboard support
- **Performance**: Optimized for smooth experience

## Quality Assurance Standards

### Professional Criteria
- [ ] Typography excellence with Google Fonts
- [ ] Perfect visual hierarchy and balance
- [ ] Accessibility compliance (WCAG AA)
- [ ] Mobile-responsive design
- [ ] Smooth animations and transitions
- [ ] Professional color psychology
- [ ] Information architecture best practices
- [ ] PowerPoint-quality visual design
- [ ] Executive-level presentation standards
- [ ] Brand-appropriate styling

### Technical Excellence
- [ ] Valid HTML5 and CSS3
- [ ] Optimized performance
- [ ] Cross-browser compatibility
- [ ] Print-friendly styles
- [ ] SEO-friendly structure
- [ ] Security best practices

## Output Requirements

Generate a complete, professional HTML presentation that:
1. Uses Google Fonts (Inter + Playfair Display)
2. Implements PowerPoint best practices
3. Features sophisticated visual hierarchy
4. Includes purposeful animations
5. Maintains accessibility standards
6. Provides mobile responsiveness
7. Uses professional color psychology
8. Implements information architecture best practices
9. Creates executive-level visual quality
10. Delivers PowerPoint-quality user experience

The presentation must be immediately usable, visually stunning, and professionally polished.`;

  const userPrompt = `Create a professional, PowerPoint-quality HTML presentation with the following specifications:

PRESENTATION DATA:
${JSON.stringify(jsonData, null, 2)}

DESIGN SYSTEM CSS VARIABLES:
${designLibrary.cssVariables}

DESIGN ANALYSIS:
${designLibrary.analysisResult}

Professional Requirements:
1. Use Google Fonts (Inter for body text, Playfair Display for headings)
2. Implement PowerPoint best practices (6x6 rule, visual hierarchy, etc.)
3. Create sophisticated visual balance and typography
4. Use professional color psychology and accessibility standards
5. Include purposeful animations and smooth transitions
6. Implement information architecture best practices
7. Create executive-level visual quality
8. Ensure mobile responsiveness with touch navigation
9. Add professional navigation controls (keyboard, touch, mouse)
10. Include print-friendly styles for professional output
11. Use the design system colors and spacing consistently
12. Create visual storytelling with proper narrative flow
13. Implement data visualization best practices
14. Add professional call-to-action elements
15. Ensure WCAG AA accessibility compliance

Generate ONLY the complete HTML file with embedded CSS and JavaScript. The result must be immediately usable, visually stunning, and professionally polished.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 12000,
      temperature: 0.3,
      response_format: { type: "text" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error response:', errorText);
    throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content received from Groq API');
  }

  return content;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { jsonData, designLibraryId } = req.body;

    if (!jsonData || !designLibraryId) {
      return res.status(400).json({ 
        message: "JSON data and design library ID are required" 
      });
    }

    // Validate JSON data structure
    if (!jsonData.slides || !Array.isArray(jsonData.slides) || !jsonData.presentationTitle) {
      return res.status(400).json({ 
        message: "Invalid JSON data structure" 
      });
    }

    // Get design library
    const designLibrary = await DesignLibrary.findById(designLibraryId);
    if (!designLibrary) {
      return res.status(404).json({ message: "Design library not found" });
    }

    // Get user's Groq API key
    const user = await User.findById(session.user.id).select('+groqApiKey');
    if (!user?.groqApiKey) {
      return res.status(400).json({ message: "Groq API key not configured" });
    }

    // Get decrypted API key
    const apiKey = user.getDecryptedApiKey();
    if (!apiKey) {
      return res.status(400).json({ message: "Invalid Groq API key" });
    }

    // Validate API key format (should start with gsk_)
    if (!apiKey.startsWith('gsk_')) {
      return res.status(400).json({ message: "Invalid Groq API key format" });
    }

    // Generate HTML presentation using Groq API
    const htmlPresentation = await callGroqAPI(apiKey, jsonData, designLibrary);

    return res.status(200).json({
      html: htmlPresentation,
      designLibraryName: designLibrary.name,
      presentationTitle: jsonData.presentationTitle,
      totalSlides: jsonData.slides.length
    });

  } catch (error) {
    console.error('Error generating HTML presentation:', error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
} 