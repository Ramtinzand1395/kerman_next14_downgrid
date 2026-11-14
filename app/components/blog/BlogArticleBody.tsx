import { sanitizeBlogContent } from "@/lib/blogContent";
import styles from "./articleTypography.module.css";

export default function BlogArticleBody({ content }: { content: string }) {
  return (
    <div
      dir="rtl"
      className={styles.body}
      dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(content) }}
    />
  );
}
