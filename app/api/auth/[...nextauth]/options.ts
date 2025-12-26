import dbConnect from "@/lib/mongodb";
import User from "@/model/User";
import { NextAuthOptions } from "next-auth";

import CredentialsProvider from "next-auth/providers/credentials";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        mobile: { label: "شماره موبایل", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.mobile) throw new Error("شماره موبای  وارد نشده است");

        await dbConnect();

        const user = await User.findOne({ mobile: credentials.mobile }).lean();

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
  debug: process.env.NODE_ENV === "development",
};
