export const stripHtmlTags = (value?: string) =>
  String(value || "")
     .replace(/<[^>]*>/g, " ")
     .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
     .trim();