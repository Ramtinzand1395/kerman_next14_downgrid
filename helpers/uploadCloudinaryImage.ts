export const uploadCloudinaryImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/cloudinary/upload", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok || !data?.url) {
    throw new Error(data?.error || "خطا در آپلود تصویر");
  }

  return data.url as string;
};
