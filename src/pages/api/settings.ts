import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// Test Groq API key by making a simple request
async function testGroqApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error testing Groq API key:', error);
    return false;
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
      const user = await User.findById(session.user.id).select('groqApiKey');
      
      return res.status(200).json({
        hasApiKey: !!user?.groqApiKey,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { groqApiKey } = req.body;

      // If API key is provided, test it
      if (groqApiKey) {
        const isValid = await testGroqApiKey(groqApiKey);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid API key" });
        }
      }

      // Update user with new API key (or remove if empty)
      const updateData = groqApiKey ? { groqApiKey } : { $unset: { groqApiKey: 1 } };
      
      await User.findByIdAndUpdate(session.user.id, updateData);

      return res.status(200).json({
        message: groqApiKey ? "API key updated successfully" : "API key removed successfully",
        hasApiKey: !!groqApiKey,
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 