import { z } from "zod";

export const promotionSchema = z.object({
  name: z.string().trim().min(1, "نام داخلی را وارد کنید").max(80),
  title: z.string().trim().min(1, "عنوان را وارد کنید").max(100),
  body: z.string().trim().min(1, "متن پیام را وارد کنید").max(800),
  ctaLabel: z.string().trim().min(1).max(50),
  ctaHref: z.string().trim().max(300).refine(
    (value) => /^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value),
    "آدرس دکمه باید یک مسیر داخلی سایت باشد، مثل /category/gaming-wall-art",
  ),
  dismissLabel: z.string().trim().min(1).max(40),
  coupon: z.string().regex(/^[a-f\d]{24}$/i, "یک کد از باشگاه مشتریان انتخاب کنید"),
  isActive: z.boolean(),
  priority: z.number().int().min(0).max(100),
}).strict();
