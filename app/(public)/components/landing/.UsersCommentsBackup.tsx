import Image from "next/image";

async function getComments() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/landing`, {
    cache: "no-store",
  });
  return res.json();
}

export default async function UsersComments() {
  const comments = await getComments();

  return (
    <section className="my-10">
      <h2 className="text-center text-3xl md:text-4xl font-black mb-16 text-[#001a6e] tracking-widest">
        نظر کاربران
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 lg:px-24">
        {comments.map((c: any) => (
          <div
            key={c._id}
            className="bg-[#001a6e] backdrop-blur-lg border border-white/20 rounded-3xl p-8 space-y-6 "
          >
            {/* ستاره‌ها */}
            <div className="flex gap-1 text-[#ece800] text-xl">
              {"★★★★★".split("").map((s, j) => (
                <span key={j}>{s}</span>
              ))}
            </div>

            {/* متن نظر */}
            <p className="text-white/90">{c.text}</p>

            {/* اطلاعات محصول و کاربر */}
            <div className="flex items-center gap-4 mt-4">
              <Image
                className="rounded-full border border-white/30"
                src={c.product.mainImage}
                width={50}
                height={50}
                alt={c.product.title}
              />
              <div className="flex flex-col">
                <span className="text-white font-semibold">
                  {c.product.title}
                </span>
                <span className="text-gray-400 text-sm">{c.user.username}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
