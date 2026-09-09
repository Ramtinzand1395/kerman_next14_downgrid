import { z } from "zod";

export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { min: 11, max: 14 },
  subject: { min: 3, max: 150 },
  message: { min: 10, max: 2000 },
} as const;

export const CONTACT_HTML_MARKUP_REGEX = /[<>]/;
export const CONTACT_PHONE_REGEX = /^(?:09\d{9}|(?:\+98|0098)9\d{9})$/;
const CONTROL_CHARACTERS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const PERSIAN_AND_ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

const normalizeText = (value: string) =>
  value.normalize("NFKC").replace(CONTROL_CHARACTERS_REGEX, "").trim();

const normalizePhone = (value: string) =>
  normalizeText(value).replace(PERSIAN_AND_ARABIC_DIGITS, (digit) => {
    const codePoint = digit.charCodeAt(0);
    const zeroCodePoint = codePoint >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(codePoint - zeroCodePoint);
  });

const plainText = (fieldLabel: string) =>
  z
    .string({ error: `${fieldLabel} باید متن باشد.` })
    .transform(normalizeText)
    .refine((value) => !CONTACT_HTML_MARKUP_REGEX.test(value), {
      message: `${fieldLabel} نباید شامل HTML باشد.`,
    });

export const contactMessageSchema = z
  .object({
    name: plainText("نام")
      .pipe(z.string().min(CONTACT_LIMITS.name.min, "نام بسیار کوتاه است."))
      .pipe(z.string().max(CONTACT_LIMITS.name.max, "نام بیش از حد طولانی است.")),
    email: z
      .string({ error: "ایمیل باید متن باشد." })
      .transform((value) => normalizeText(value).toLowerCase())
      .pipe(z.string().max(CONTACT_LIMITS.email.max, "ایمیل بیش از حد طولانی است."))
      .pipe(z.string().email("ایمیل معتبر نیست.")),
    phone: z
      .string({ error: "شماره تماس باید متن باشد." })
      .transform(normalizePhone)
      .pipe(
        z
          .string()
          .min(CONTACT_LIMITS.phone.min, "شماره تماس بسیار کوتاه است.")
          .max(CONTACT_LIMITS.phone.max, "شماره تماس بیش از حد طولانی است.")
          .regex(CONTACT_PHONE_REGEX, "شماره تماس معتبر نیست."),
      ),
    subject: plainText("موضوع")
      .pipe(z.string().min(CONTACT_LIMITS.subject.min, "موضوع بسیار کوتاه است."))
      .pipe(z.string().max(CONTACT_LIMITS.subject.max, "موضوع بیش از حد طولانی است.")),
    message: plainText("متن پیام")
      .pipe(z.string().min(CONTACT_LIMITS.message.min, "متن پیام بسیار کوتاه است."))
      .pipe(z.string().max(CONTACT_LIMITS.message.max, "متن پیام بیش از حد طولانی است.")),
  })
  .strict();

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
