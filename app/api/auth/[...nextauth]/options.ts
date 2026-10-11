import dbConnect from "@/lib/mongodb";
import Otp from "@/model/Otp";
import User from "@/model/User";
import { NextAuthOptions } from "next-auth";
import { createHash } from "node:crypto";

import CredentialsProvider from "next-auth/providers/credentials";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        verificationToken: { label: "توکن تایید", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.verificationToken) {
          throw new Error("تایید شماره موبایل انجام نشده است");
        }

        await dbConnect();

        const loginTokenHash = createHash("sha256")
          .update(credentials.verificationToken)
          .digest("hex");
        const ticket = await Otp.findOneAndDelete({
          loginTokenHash,
          verifiedAt: { $exists: true },
          loginTokenExpiresAt: { $gt: new Date() },
        }).lean();

        if (!ticket) throw new Error("تایید ورود منقضی شده است");

        const user = await User.findOne({ mobile: ticket.mobile }).lean();

        if (!user) throw new Error("کاربری با این شماره موبایل یافت نشد");

        return {
          id: user._id.toString(),
          mobile: user.mobile,
          username: user.username, // اگر دارید
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => {
      if (token) {
        session.user = {
          id: token.id as string,
          mobile: token.mobile as string,
          username: token.username as string,
          role: token.role as string,
        };
      }
      return session;
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.mobile = user.mobile;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
  },

  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  // Keep authentication logs opt-in; enabling debug unconditionally emits a warning.
  debug: process.env.NEXTAUTH_DEBUG === "true",
};
