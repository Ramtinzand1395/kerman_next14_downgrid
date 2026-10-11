import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import { BlogPost } from "@/types";

/**
 * Fetches published blog posts directly from the database.
 * Intended for use in Server Components, Server Actions, and API routes.
 * Do NOT import this from Client Components.
 */
export async function getPublishedBlogs(limit: number = 9): Promise<BlogPost[]> {
  try {
    await dbConnect();

    const blogs = await Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return blogs as unknown as BlogPost[];
  } catch {
    return [];
  }
}