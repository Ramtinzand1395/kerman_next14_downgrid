/** Friendly, consistent feedback for the admin product image upload. */
export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const ACCEPTED_TYPES = new Set(PRODUCT_IMAGE_ACCEPT.split(","));

export function validateProductImage(file: File): void {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error("فرمت «" + file.name + "» پشتیبانی نمی‌شود. عکس JPG، PNG، WebP، GIF یا AVIF انتخاب کنید.");
  }
  if (file.size === 0) {
    throw new Error("فایل «" + file.name + "» خالی است. تصویر سالم دیگری انتخاب کنید.");
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("حجم «" + file.name + "» بیشتر از ۱۰ مگابایت است. تصویر را فشرده یا کوچک‌تر کنید و دوباره انتخاب کنید.");
  }
}

const readUploadMessage = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const message = (payload as { error?: unknown }).error;
  return typeof message === "string" && message.trim() ? message.trim().slice(0, 300) : undefined;
};

export async function uploadCloudinaryImage(file: File): Promise<string> {
  validateProductImage(file);

  const body = new FormData();
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch("/api/admin/cloudinary/upload", {
      method: "POST",
      body,
    });
  } catch {
    throw new Error("ارتباط با سرور آپلود برقرار نشد. اینترنت یا VPN را بررسی کنید و دوباره تلاش کنید.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = readUploadMessage(payload);
    if (response.status === 401) throw new Error("نشست مدیریت تمام شده است. دوباره وارد پنل شوید و آپلود را تکرار کنید.");
    if (response.status === 403) throw new Error("حساب فعلی اجازه آپلود تصویر ندارد. با حساب مدیر اصلی وارد شوید.");
    if (response.status === 413) throw new Error("حجم عکس بیشتر از حد مجاز سرور (۱۰ مگابایت) است. آن را فشرده کنید.");
    if (response.status === 429) throw new Error("تعداد درخواست‌های آپلود زیاد بوده است. کمی بعد دوباره امتحان کنید.");
    if (response.status >= 500) throw new Error(message || "سرویس ذخیره تصویر در دسترس نیست. عکس را نگه دارید و کمی بعد دوباره تلاش کنید.");
    throw new Error(message || "این تصویر از طرف سرور پذیرفته نشد. نوع فایل و حجم آن را بررسی کنید.");
  }

  const url = payload && typeof payload === "object" ? (payload as { url?: unknown }).url : null;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("سرور آپلود پاسخ معتبر برنگرداند؛ قبل از انتخاب دوباره، وضعیت تصویر را بررسی کنید.");
  }
  return url;
}
