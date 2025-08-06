/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DesignLibrary from "@/models/DesignLibrary";
import SystemPrompt from "@/models/SystemPrompt";

async function callGroqVisionAPI(apiKey: string, imageBase64: string, systemPrompt: string): Promise<{ cssVariables: string; analysisResult: string }> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: systemPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            }
          ]
        }
      ],
      max_completion_tokens: 4000,
      temperature: 0.7,
      response_format: { type: "json_object" }
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

  try {
    const parsedContent = JSON.parse(content);
    return {
      cssVariables: parsedContent.cssVariables || '',
      analysisResult: parsedContent.analysisResult || ''
    };
  } catch (error) {
    throw new Error('Invalid JSON response from Groq API');
  }
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

  if (req.method === "GET") {
    try {
      const designLibraries = await DesignLibrary.find({ createdBy: session.user.id })
        .populate('systemPromptId', 'name')
        .sort({ createdAt: -1 });
      
      return res.status(200).json(designLibraries);
    } catch (error) {
      console.error('Error fetching design libraries:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, description, imageBase64, systemPromptId } = req.body;

      if (!name || !description || !imageBase64 || !systemPromptId) {
        return res.status(400).json({ 
          message: "Name, description, image, and system prompt are required" 
        });
      }

      // Get system prompt
      const systemPrompt = await SystemPrompt.findById(systemPromptId);
      if (!systemPrompt || !systemPrompt.isActive) {
        return res.status(400).json({ message: "System prompt not found or inactive" });
      }

      // Get user's Groq API key
      const user = await (await import('@/models/User')).default.findById(session.user.id).select('+groqApiKey');
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

      // Validate image base64
      if (!imageBase64 || imageBase64.length < 100) {
        return res.status(400).json({ message: "Invalid image data" });
      }

      // Check image size (4MB limit for base64)
      const imageSizeInBytes = Math.ceil((imageBase64.length * 3) / 4);
      const imageSizeInMB = imageSizeInBytes / (1024 * 1024);
      if (imageSizeInMB > 4) {
        return res.status(400).json({ message: "Image too large. Maximum size is 4MB" });
      }

      // Call Groq Vision API
      const { cssVariables, analysisResult } = await callGroqVisionAPI(
        apiKey,
        imageBase64,
        systemPrompt.prompt
      );

      // Create design library
      const newDesignLibrary = await DesignLibrary.create({
        name,
        description,
        cssVariables,
        analysisResult,
        systemPromptId,
        createdBy: session.user.id,
      });

      return res.status(201).json(newDesignLibrary);
    } catch (error) {
      console.error('Error creating design library:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { id, name, description } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Design library ID is required" });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;

      const updatedDesignLibrary = await DesignLibrary.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!updatedDesignLibrary) {
        return res.status(404).json({ message: "Design library not found" });
      }

      return res.status(200).json(updatedDesignLibrary);
    } catch (error) {
      console.error('Error updating design library:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: "Design library ID is required" });
      }

      const deletedDesignLibrary = await DesignLibrary.findByIdAndDelete(id);

      if (!deletedDesignLibrary) {
        return res.status(404).json({ message: "Design library not found" });
      }

      return res.status(200).json({ message: "Design library deleted successfully" });
    } catch (error) {
      console.error('Error deleting design library:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
} 