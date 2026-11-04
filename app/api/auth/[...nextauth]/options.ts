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
          verifiedAt: { $type: "date", $lte: new Date() },
          loginTokenExpiresAt: { $gt: new Date() },
        }).lean();

        if (!ticket || !(ticket.verifiedAt instanceof Date) ||
          !Number.isFinite(ticket.verifiedAt.getTime()) ||
          !/^09\d{9}$/.test(ticket.mobile)) {
          throw new Error("تایید ورود منقضی شده است");
        }

        // Persist OTP evidence before issuing a session, including legacy accounts.
        // A failed write must fail login instead of creating an unverified session.
        const user = await User.findOneAndUpdate(
          { mobile: ticket.mobile },
          [{ $set: {
            phoneVerifiedAt: { $cond: [
              { $eq: [{ $type: "$phoneVerifiedAt" }, "date"] },
              "$phoneVerifiedAt", ticket.verifiedAt,
            ] },
            registrationCompletedAt: { $cond: [
              { $eq: [{ $type: "$registrationCompletedAt" }, "date"] },
              "$registrationCompletedAt", ticket.verifiedAt,
            ] },
          } }],
          { returnDocument: "after", updatePipeline: true },
        ).lean();

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
