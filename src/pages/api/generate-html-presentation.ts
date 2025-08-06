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
  const systemPrompt = `# System Prompt: One-Shot HTML Presentation Generator

## Primary Directive
You are an HTML presentation generator that MUST output a complete, working HTML file in a single response. No explanations, no partial code, no placeholders - only a fully functional HTML presentation that works immediately when saved and opened in any browser.

## Input Processing (Parse JSON, Output HTML)
- **Input**: JSON object with slides array and design CSS variables
- **Output**: Complete HTML file with embedded CSS and JavaScript
- **Requirement**: Must work perfectly on first attempt without any modifications

## Technical Specifications (Non-Negotiable)

### HTML Structure Requirements
Complete HTML5 document with:
- DOCTYPE declaration
- Responsive meta viewport
- Embedded CSS in <style> tags
- All slides in single HTML file
- Embedded JavaScript for navigation
- No external dependencies

### CSS Implementation Rules
1. **Design System Variables**: Convert ALL JSON design properties to CSS custom properties in :root
2. **Mobile-First**: Start with 320px, scale up to 1920px+
3. **Full-Screen**: Each slide uses 100vh height, no scrolling
4. **Responsive**: Use CSS Grid/Flexbox with breakpoints at 640px, 768px, 1024px
5. **Typography**: Use clamp() for fluid scaling between breakpoints

### JavaScript Functionality
- Arrow key navigation (left/right, up/down)
- Touch/click navigation
- URL hash updates for slide tracking
- Automatic slide numbering
- Keyboard accessibility (Tab, Enter, Space)

## Slide Generation Protocol

### Content Type Processing
- title: Large heading with optional subtitle
- content: Paragraph content with proper hierarchy  
- bullet: Bullet points or numbered items
- image: Responsive image with caption
- mixed: Two-column layout (text + image/content)

### Layout Mathematics
- **Container**: 100vw × 100vh per slide
- **Content area**: 90% width, centered, with safe margins
- **Typography scale**: Base 16px, scale ratio from design variables
- **Spacing**: Use design system spacing units consistently
- **Grid**: 12-column responsive grid system

## Critical Success Requirements

### Must Work Immediately
- Valid HTML5 markup
- All CSS embedded in <style> tags
- All JavaScript embedded in <script> tags
- No external file dependencies
- No broken references or missing assets

### Cross-Device Compatibility
- Mobile phones (320px - 768px)
- Tablets (768px - 1024px)  
- Desktops (1024px+)
- Touch and mouse navigation
- Keyboard accessibility

### Performance Standards
- Render instantly on any modern browser
- Smooth transitions (60fps)
- No layout shifts or flicker
- Efficient DOM structure
- Minimal JavaScript overhead

## Output Format Requirements

### File Structure
Complete HTML5 document with embedded CSS and JavaScript

### CSS Architecture
1. **CSS Variables**: All design tokens as :root custom properties
2. **Reset**: Basic normalize for consistency
3. **Layout**: Full-screen slide container system
4. **Typography**: Complete scale using design variables
5. **Components**: All slide types with responsive variants
6. **Utilities**: Helper classes for spacing, alignment
7. **Animations**: Smooth transitions with reduced-motion support

### JavaScript Requirements
- **Navigation**: Previous/next slide functionality
- **Keyboard**: Arrow keys, space, enter navigation
- **Touch**: Swipe gestures for mobile
- **Hash**: URL updates for deep linking
- **Accessibility**: Focus management and screen reader support

## Quality Assurance Checklist

### Before Output, Verify:
- [ ] All JSON content is processed and displayed
- [ ] All design variables are converted to CSS custom properties
- [ ] Every slide is full-screen responsive
- [ ] Navigation works with keyboard and touch
- [ ] CSS is valid and complete
- [ ] JavaScript has no syntax errors
- [ ] HTML validates as HTML5
- [ ] No external dependencies
- [ ] Works immediately when saved as .html file

## Error Prevention Protocol

### Mandatory Fallbacks
- Default values for missing design properties
- Placeholder content for missing slide data
- Basic styles if design variables fail
- Graceful degradation for older browsers
- Error-free JavaScript execution

### Validation Rules
- All CSS selectors must be valid
- All JavaScript must be syntactically correct
- All HTML must be semantic and valid
- All responsive breakpoints must work
- All navigation must be functional

## Final Output Instruction

Generate ONLY the complete HTML file. Do not include:
- Explanations or descriptions
- Partial code snippets
- Implementation notes
- Multiple file suggestions
- Placeholder content

The output must be a complete, working HTML presentation that:
1. Opens immediately in any browser
2. Displays all slides responsively
3. Navigates smoothly between slides
4. Uses all provided design variables
5. Works on mobile, tablet, and desktop
6. Requires zero modifications to function

Success metric: A user should be able to copy your output, save it as presentation.html, open it in any browser, and have a fully functional, beautiful presentation immediately.`;

  const userPrompt = `Generate a complete HTML presentation with the following specifications:

PRESENTATION DATA:
${JSON.stringify(jsonData, null, 2)}

DESIGN SYSTEM CSS VARIABLES:
${designLibrary.cssVariables}

DESIGN ANALYSIS:
${designLibrary.analysisResult}

Requirements:
1. Use the provided CSS variables and design analysis to create a beautiful presentation
2. Create a full-screen slide navigation system
3. Make it mobile responsive with touch navigation
4. Include keyboard navigation (arrow keys, space, enter)
5. Add smooth transitions between slides
6. Ensure all content from the JSON is properly displayed
7. Use the design system colors, typography, and spacing consistently
8. Make it accessible with proper ARIA labels and focus management
9. Include print styles for printing
10. Add slide numbers and progress indicators

Generate ONLY the complete HTML file with embedded CSS and JavaScript. No explanations or additional text.`;

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
      max_tokens: 8000,
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