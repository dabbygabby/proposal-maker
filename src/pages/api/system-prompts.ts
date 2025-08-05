import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import SystemPrompt from "@/models/SystemPrompt";

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
      const { category, active } = req.query;
      
      let filter: any = {};
      
      if (category && category !== 'all') {
        filter.category = category;
      }
      
      if (active === 'true') {
        filter.isActive = true;
      }
      
      const prompts = await SystemPrompt.find(filter).sort({ createdAt: -1 });
      
      return res.status(200).json(prompts);
    } catch (error) {
      console.error('Error fetching system prompts:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, description, prompt, category } = req.body;

      if (!name || !description || !prompt) {
        return res.status(400).json({ message: "Name, description, and prompt are required" });
      }

      // Check if prompt with same name already exists
      const existingPrompt = await SystemPrompt.findOne({ name });
      if (existingPrompt) {
        return res.status(400).json({ message: "A prompt with this name already exists" });
      }

      const newPrompt = await SystemPrompt.create({
        name,
        description,
        prompt,
        category: category || 'general',
        createdBy: session.user.id,
      });

      return res.status(201).json(newPrompt);
    } catch (error) {
      console.error('Error creating system prompt:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { id, name, description, prompt, category, isActive } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Prompt ID is required" });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (prompt) updateData.prompt = prompt;
      if (category) updateData.category = category;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;

      const updatedPrompt = await SystemPrompt.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!updatedPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      return res.status(200).json(updatedPrompt);
    } catch (error) {
      console.error('Error updating system prompt:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: "Prompt ID is required" });
      }

      const deletedPrompt = await SystemPrompt.findByIdAndDelete(id);

      if (!deletedPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      return res.status(200).json({ message: "Prompt deleted successfully" });
    } catch (error) {
      console.error('Error deleting system prompt:', error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 