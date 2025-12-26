import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      mobile: string;
      username: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    mobile: string;
    username: string;
    role: string;
  }

  interface JWT {
    id: string;
    mobile: string;
    username: string;
    role: string;
  }
}
