import crypto from "crypto";
import type mongoose from "mongoose";

export function generateReferralCode(prefix = "KA", len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  return `${prefix}-${out}`;
}

export async function generateUniqueReferralCodeWithModel(
  UserModel: mongoose.Model<any>,
  prefix = "KA",
  len = 6,
  maxTries = 10,
) {
  for (let i = 0; i < maxTries; i++) {
    const code = generateReferralCode(prefix, len);
    const exists = await UserModel.exists({ referralCode: code });
    if (!exists) return code;
  }
  const fallback = generateReferralCode(prefix, len + 2);
  const exists = await UserModel.exists({ referralCode: fallback });
  if (!exists) return fallback;

  throw new Error("FAILED_TO_GENERATE_UNIQUE_REFERRAL_CODE");
}
