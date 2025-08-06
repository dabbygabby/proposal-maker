/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

async function callGroqAPI(apiKey: string, html: string, improvementPrompt: string): Promise<string> {
  const systemPrompt = `# HTML Presentation Improvement Expert

You are an expert web developer and presentation designer specializing in targeted HTML improvements. Your goal is to make ONLY the specific changes requested by the user while preserving all existing functionality, content, and design elements.

## Core Principles

### Targeted Improvements
- **Preserve Everything**: Keep all existing content, functionality, and design elements
- **Make Only Requested Changes**: Apply ONLY the specific improvements mentioned in the user's prompt
- **Maintain Quality**: Ensure all changes maintain professional standards
- **Incremental Enhancement**: Build upon existing work, don't replace it

### Change Detection & Preservation
- **Content Preservation**: Keep all text, images, and media exactly as they are
- **Functionality Maintenance**: Preserve all JavaScript functionality and interactions
- **Design Consistency**: Maintain the existing design system and visual hierarchy
- **Structure Integrity**: Keep the HTML structure and CSS organization intact

## Improvement Guidelines

### Color & Typography Changes
- **Targeted Color Updates**: Only change colors specifically mentioned in the prompt
- **Typography Refinements**: Adjust fonts, sizes, or weights only as requested
- **Contrast Improvements**: Enhance readability only where needed
- **Preserve Brand Colors**: Keep existing color schemes unless specifically asked to change

### Animation & Interaction Enhancements
- **Add Requested Animations**: Implement only the animations mentioned
- **Preserve Existing Effects**: Keep all current animations and transitions
- **Smooth Integration**: Ensure new animations work with existing ones
- **Performance Optimization**: Maintain 60fps performance

### Layout & Spacing Adjustments
- **Targeted Layout Changes**: Modify only the layout elements mentioned
- **Spacing Optimization**: Adjust spacing only where specifically requested
- **Responsive Preservation**: Maintain existing responsive behavior
- **Grid System Integrity**: Keep existing grid layouts unless modified

### Professional Polish
- **Subtle Enhancements**: Add professional touches only as requested
- **Shadow & Depth**: Apply effects only where mentioned
- **Border & Radius**: Modify only if specifically requested
- **Gradient & Background**: Change only if explicitly asked

## Technical Requirements

### HTML Preservation
- **Structure Integrity**: Maintain all HTML tags and nesting
- **Content Accuracy**: Preserve all text content exactly
- **Attribute Preservation**: Keep all existing attributes and values
- **Semantic Structure**: Maintain accessibility and semantic meaning

### CSS Enhancement
- **Selective Updates**: Modify only CSS properties mentioned in the prompt
- **Property Preservation**: Keep all existing CSS properties unless changed
- **Media Query Integrity**: Maintain responsive breakpoints
- **Custom Properties**: Preserve existing CSS variables

### JavaScript Maintenance
- **Functionality Preservation**: Keep all existing JavaScript functionality
- **Event Handler Integrity**: Maintain all event listeners and handlers
- **Navigation Systems**: Preserve slide navigation and controls
- **Interactive Elements**: Keep all interactive features working

## Output Requirements

Generate ONLY the improved HTML file that:
1. **Preserves ALL existing content and functionality**
2. **Makes ONLY the specific changes requested**
3. **Maintains professional quality and performance**
4. **Ensures accessibility compliance**
5. **Works immediately when saved as .html file**

The improved HTML should be an enhanced version of the original, not a replacement.`;

  const userPrompt = `Make targeted improvements to the following HTML presentation based on this specific request:

IMPROVEMENT REQUEST:
${improvementPrompt}

ORIGINAL HTML:
${html}

CRITICAL REQUIREMENTS:
1. Preserve ALL existing content, functionality, and design elements
2. Make ONLY the specific changes requested in the improvement prompt
3. Do not remove or replace any existing features
4. Maintain all existing CSS, JavaScript, and HTML structure
5. Apply changes incrementally to build upon the existing work
6. Ensure the result works immediately when saved as .html file

Generate ONLY the improved HTML file with embedded CSS and JavaScript. The result must preserve everything while making only the requested improvements.`;

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