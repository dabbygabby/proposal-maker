/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Proposal from "@/models/Proposal";
import { randomBytes } from "crypto";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const session = await getServerSession(req, res, authOptions);

  if (req.method === "POST") {
    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, html } = req.body;

    if (!name || !html) {
      return res.status(400).json({ message: "Missing name or html" });
    }

    const shareableLink = randomBytes(8).toString("hex");

    if (!session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const proposal = await Proposal.create({
        name,
        html,
        shareableLink,
        user: session.user.id,
      });
      return res.status(201).json(proposal);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "GET") {
    const { shareableLink } = req.query;

    // Public route for fetching a single proposal
    if (typeof shareableLink === "string") {
      try {
        const proposal = await Proposal.findOne({ shareableLink });
        if (!proposal) {
          return res.status(404).json({ message: "Proposal not found" });
        }
        return res.status(200).json(proposal);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    }

    // Public route for fetching all proposals
    try {
      const proposals = await Proposal.find({});
      return res.status(200).json(proposals);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  res.setHeader("Allow", ["POST", "GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
