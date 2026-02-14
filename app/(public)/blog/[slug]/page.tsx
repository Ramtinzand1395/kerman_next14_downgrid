import { BlogPost } from "@/types";
import Image from "next/image";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

async function getBlog(slug: string): Promise<BlogPost | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/blog/${slug}`, { cache: "no-store" });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

export default async function BlogDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const blog = await getBlog(slug);

  if (!blog) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <h1 className="text-2xl font-black text-slate-900 md:text-4xl">{blog.title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {new Date(blog.createdAt).toLocaleDateString("fa-IR")}
      </p>

      {blog.coverImage ? (
        <div className="relative mt-6 h-72 w-full overflow-hidden rounded-2xl md:h-96">
          <Image src={blog.coverImage} alt={blog.title} fill className="object-cover" />
        </div>
      ) : null}

      <p className="mt-8 whitespace-pre-line leading-8 text-slate-700">{blog.content}</p>
    </article>
  );
}
