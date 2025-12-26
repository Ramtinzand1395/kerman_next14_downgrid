
export async function fetcher(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}${path}`);

    if (!res.ok) {
      console.error("FETCH ERROR:", res.status, res.statusText);
      return [];
    }

    return await res.json();
  } catch (err) {
    console.error("NETWORK ERROR:", err);
    return [];
  }
}
