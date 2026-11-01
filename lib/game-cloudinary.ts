import { v2 as cloudinary } from "cloudinary";

export function gameCloudinaryConfig() {
  const cloud_name = process.env.GAME_CLOUDINARY_CLOUD_NAME || "aeylqy7h";
  const api_key = process.env.GAME_CLOUDINARY_API_KEY;
  const api_secret = process.env.GAME_CLOUDINARY_API_SECRET;
  if (!api_key || !api_secret) throw new Error("GAME_CLOUDINARY_NOT_CONFIGURED");
  return { cloud_name, api_key, api_secret, secure: true };
}

export async function uploadGameCover(buffer: Buffer) {
  // Pass credentials per request: never change the shared product/blog SDK config.
  const credentials = gameCloudinaryConfig();
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      ...credentials,
      resource_type: "image",
      folder: "game-covers",
      format: "webp",
      transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto:good" }],
      allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    }, (error, result) => {
      if (error || !result?.secure_url || !result.public_id) {
        reject(error || new Error("Invalid Cloudinary upload response"));
      } else resolve({ url: result.secure_url, publicId: result.public_id });
    }).end(buffer);
  });
}
