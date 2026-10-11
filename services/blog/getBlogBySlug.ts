import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import { BlogPost } from "@/types";

/**
 * Fetches a single published blog post by slug directly from the database.
 * Intended for use in Server Components, Server Actions, and API routes.
 * Do NOT import this from Client Components.
 */
export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    await dbConnect();

    const blog = await Blog.findOne({ slug, published: true }).lean();

    if (!blog) return null;

    return blog as unknown as BlogPost;
  } catch {
    return null;
  }
}