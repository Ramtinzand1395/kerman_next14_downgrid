export default function PageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8" dir="rtl">
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <div className="rounded-2xl bg-white p-4 shadow">{children}</div>
    </main>
  );
}
