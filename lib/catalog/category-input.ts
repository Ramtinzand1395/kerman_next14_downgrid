import { z } from "zod";
const text = (max: number) => z.string().trim().max(max).default("");
export const categorySeoInput = z
  .object({
    seoTitle: text(100),
    metaDescription: text(200),
    introduction: text(3000),
    buyingGuide: text(10000),
    faqs: z
      .array(
        z.object({
          question: z.string().trim().min(1).max(200),
          answer: z.string().trim().min(1).max(2000),
        }),
      )
      .max(10)
      .default([]),
  })
  .strict();
