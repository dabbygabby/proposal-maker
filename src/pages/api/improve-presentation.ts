/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

async function callGroqAPI(apiKey: string, html: string, improvementPrompt: string): Promise<string> {
  const systemPrompt = `# HTML Presentation Improvement Expert

You are an expert web developer and presentation designer specializing in improving HTML presentations. Your goal is to enhance the provided HTML based on specific user requests while maintaining professional quality and functionality.

## Core Responsibilities

### HTML Enhancement
- **CSS Improvements**: Enhance colors, typography, spacing, and visual hierarchy
- **Animation Enhancement**: Add smooth transitions, hover effects, and purposeful animations
- **Layout Optimization**: Improve responsive design, grid systems, and visual balance
- **Accessibility**: Ensure WCAG AA compliance and keyboard navigation
- **Performance**: Optimize CSS and JavaScript for smooth performance

### Design Intelligence
- **Visual Hierarchy**: Use size, color, and spacing to guide attention
- **Typography**: Enhance font choices, weights, and readability
- **Color Psychology**: Apply strategic color usage for emotion and impact
- **White Space**: Optimize breathing room for professional appearance
- **Grid Systems**: Implement sophisticated layout grids for consistency

### Technical Excellence
- **Google Fonts**: Use Inter and Playfair Display for professional typography
- **CSS Grid/Flexbox**: Advanced layout techniques for responsive design
- **CSS Custom Properties**: Dynamic theming and maintainable code
- **CSS Animations**: Smooth, purposeful transitions with easing functions
- **Mobile-First**: Responsive design that works on all devices

## Improvement Guidelines

### Color Enhancements
- Enhance color schemes for better contrast and accessibility
- Implement color psychology for emotional impact
- Use semantic colors for different content types
- Create harmonious color palettes

### Typography Improvements
- Optimize font sizes and line heights for readability
- Implement proper font hierarchy and weights
- Use Google Fonts for professional appearance
- Ensure proper letter spacing and text contrast

### Animation & Interaction
- Add smooth slide transitions and navigation
- Implement hover effects for interactive elements
- Create purposeful animations that enhance UX
- Ensure accessibility with reduced-motion support

### Layout & Spacing
- Improve visual balance and alignment
- Optimize spacing using consistent design systems
- Enhance responsive breakpoints for all devices
- Implement sophisticated grid layouts

### Professional Polish
- Add subtle shadows and depth effects
- Implement modern border radius and styling
- Create professional gradients and backgrounds
- Ensure print-friendly styles

## Output Requirements

Generate ONLY the improved HTML file. The output must:
1. Maintain all original functionality and content
2. Implement the requested improvements
3. Use professional CSS and JavaScript
4. Ensure accessibility compliance
5. Provide smooth performance
6. Work immediately when saved as .html file

The improved HTML should be immediately usable, visually enhanced, and professionally polished.`;

  const userPrompt = `Improve the following HTML presentation based on this specific request:

IMPROVEMENT REQUEST:
${improvementPrompt}

ORIGINAL HTML:
${html}

Requirements:
1. Maintain all original content and functionality
2. Implement the specific improvements requested
3. Use Google Fonts (Inter + Playfair Display) for typography
4. Ensure professional visual hierarchy and balance
5. Add smooth animations and transitions where appropriate
6. Maintain accessibility standards (WCAG AA)
7. Optimize for mobile responsiveness
8. Use professional color psychology
9. Implement modern CSS techniques
10. Ensure the result works immediately when saved as .html

Generate ONLY the improved HTML file with embedded CSS and JavaScript. The result must be immediately usable and professionally enhanced.`;

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
      max_tokens: 15000,
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
    const { html, prompt } = req.body;

    if (!html || !prompt) {
      return res.status(400).json({ 
        message: "HTML content and improvement prompt are required" 
      });
    }

    // Validate HTML content
    if (typeof html !== 'string' || html.length < 100) {
      return res.status(400).json({ 
        message: "Invalid HTML content" 
      });
    }

    // Validate prompt
    if (typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({ 
        message: "Improvement prompt must be at least 10 characters long" 
      });
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

    // Improve HTML presentation using Groq API
    const improvedHtml = await callGroqAPI(apiKey, html, prompt);

    return res.status(200).json({
      html: improvedHtml,
      presentationTitle: "Improved Presentation",
      totalSlides: 0, // This will be extracted from the improved HTML if needed
      designLibraryName: "Enhanced Design"
    });

  } catch (error) {
    console.error('Error improving HTML presentation:', error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
} 