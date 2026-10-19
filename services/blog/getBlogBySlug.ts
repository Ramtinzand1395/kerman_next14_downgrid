import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import { BlogPost } from "@/types";

function getSlugCandidates(slug: string): string[] {
  const candidates = new Set<string>();
  let current = slug;

  // Depending on the reverse proxy and Next.js route type, a dynamic segment can
  // arrive decoded, percent-encoded, or (rarely) double-encoded. MongoDB string
  // matching is exact, so include every safe representation of the requested slug.
  for (let pass = 0; pass < 3; pass += 1) {
    candidates.add(current);
    candidates.add(current.normalize("NFC"));
    candidates.add(current.normalize("NFD"));

    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }

  return [...candidates];
}

/**
 * Fetches a single published blog post by slug directly from the database.
 * Intended for use in Server Components, Server Actions, and API routes.
 * Do NOT import this from Client Components.
 */
export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  await dbConnect();

  const blog = await Blog.findOne({
    slug: { $in: getSlugCandidates(slug) },
    published: true,
  }).lean();

  if (!blog) return null;

  return blog as unknown as BlogPost;
}
