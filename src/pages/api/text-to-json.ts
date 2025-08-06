/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import SystemPrompt from "@/models/SystemPrompt";
import { randomUUID } from "crypto";

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

async function callGroqAPI(apiKey: string, text: string, model: string, systemPromptId?: string): Promise<JsonResponse> {
  let prompt: string;
  
  if (systemPromptId) {
    // Get system prompt from database
    const systemPrompt = await SystemPrompt.findById(systemPromptId);
    if (!systemPrompt || !systemPrompt.isActive) {
      throw new Error('System prompt not found or inactive');
    }
    prompt = systemPrompt.prompt.replace('{text}', text);
  } else {
    // Default prompt
    prompt = `Analyze the following text and convert it into a structured JSON format suitable for creating a PowerPoint presentation. 

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

Return only valid JSON, no additional text or explanations.`;
    
    prompt = prompt.replace('{text}', text);
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from Groq API');
  }

  try {
    // Try to parse the JSON response
    const jsonResponse = JSON.parse(content);
    
    // Validate and enhance the response
    if (!jsonResponse.slides || !Array.isArray(jsonResponse.slides)) {
      throw new Error('Invalid response structure: missing slides array');
    }

    // Ensure each slide has an id
    const enhancedSlides = jsonResponse.slides.map((slide: any) => ({
      ...slide,
      id: slide.id || randomUUID(),
      type: slide.type || 'content'
    }));

    return {
      presentationTitle: jsonResponse.presentationTitle || 'Generated Presentation',
      totalSlides: enhancedSlides.length,
      slides: enhancedSlides
    };
  } catch (parseError) {
    console.error('Error parsing JSON response:', parseError);
    console.error('Raw response:', content);
    throw new Error('Invalid JSON response from AI model');
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { text, model, systemPromptId } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: "Text content is required" });
    }

    if (!model || typeof model !== 'string') {
      return res.status(400).json({ message: "Model selection is required" });
    }

    // Validate model selection
    const validModels = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
    if (!validModels.includes(model)) {
      return res.status(400).json({ message: "Invalid model selection" });
    }

    // Get user's API key - need to explicitly include it since it has select: false
    const user = await User.findById(session.user.id).select('+groqApiKey');
    console.log('User found:', !!user, 'Has API key:', !!user?.groqApiKey);
    
    if (!user?.groqApiKey) {
      return res.status(400).json({ 
        message: "Groq API key is required. Please configure your API key in settings." 
      });
    }

    // Decrypt the API key
    const decryptedApiKey = user.getDecryptedApiKey();
    console.log('Decrypted API key:', !!decryptedApiKey);
    
    if (!decryptedApiKey) {
      return res.status(500).json({ message: "Error accessing API key" });
    }

    // Call Groq API
    const result = await callGroqAPI(decryptedApiKey, text, model, systemPromptId);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in text-to-json API:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(400).json({ 
          message: "Invalid API key. Please check your Groq API key in settings." 
        });
      }
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please try again later." 
        });
      }
    }
    
    return res.status(500).json({ 
      message: "An error occurred while processing your request",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 