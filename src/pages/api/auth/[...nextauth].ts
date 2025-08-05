import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export default handler;
