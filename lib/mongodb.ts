import mongoose, { Mongoose } from "mongoose";

// ---- افزودن تایپ به global ----
declare global {
  // اجازه می‌دهیم یک ویژگی به نام mongoose در global وجود داشته باشد
  var mongooseCache:
    | {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      }
    | undefined;
}

// ---- مقداردهی اولیه به حافظه global ----
let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export default async function dbConnect() {
  const mongodbUri = process.env.MONGODB_URI?.trim();
  if (!mongodbUri) {
    throw new Error("لطفاً MONGODB_URI را در فایل .env تنظیم کنید");
  }

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    // Models loaded during the initial connection must wait for the database
    // before creating collections and indexes.
    cached!.promise = mongoose.connect(mongodbUri).catch((error) => {
      // A rejected promise must not poison this server instance forever.
      cached!.promise = null;
      cached!.conn = null;
      throw error;
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
