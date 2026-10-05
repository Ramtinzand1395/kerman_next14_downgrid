import mongoose from "mongoose";
import { encode } from "next-auth/jwt";
import { writeFile } from "node:fs/promises";

process.loadEnvFile(".env");

const uri = process.env.MONGODB_URI;
const secret = process.env.NEXTAUTH_SECRET;
if (!uri || !secret) throw new Error("Missing local application configuration");

await mongoose.connect(uri, { bufferCommands: false });
const users = mongoose.connection.collection("users");

async function makeCookie(roleQuery, destination) {
  const user = await users.findOne(roleQuery, {
    projection: { _id: 1, mobile: 1, username: 1, role: 1 },
  });
  if (!user) throw new Error(`No matching local user for ${destination}`);

  const token = await encode({
    secret,
    maxAge: 60 * 60,
    token: {
      id: user._id.toString(),
      sub: user._id.toString(),
      mobile: user.mobile,
      username: user.username || "کاربر",
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  });

  await writeFile(destination, `Cookie: next-auth.session-token=${token}\n`, "utf8");
}

await makeCookie({ role: "user" }, "artifacts/appointments-guide/user.cookie");
await makeCookie({ role: { $in: ["admin", "superadmin"] } }, "artifacts/appointments-guide/admin.cookie");
await mongoose.disconnect();
