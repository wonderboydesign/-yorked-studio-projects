import { upload } from "@vercel/blob/client";

export const ALLOWED_EXTENSIONS = [
  "ai", "svg", "pdf", "jpg", "jpeg", "png", "webp", "gif",
  "doc", "docx", "txt", "md", "pptx", "key",
];
export const IMAGE_EXTENSIONS = ["svg", "jpg", "jpeg", "png", "webp", "gif"];

export interface UploadedFile {
  filename: string;
  url: string;
  pathname: string;
  contentType: string;
}

// Sube un archivo a Vercel Blob (mismo endpoint que los adjuntos de tareas)
export async function uploadFile(file: File, allowed = ALLOWED_EXTENSIONS): Promise<UploadedFile> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !allowed.includes(extension)) {
    throw new Error(`"${file.name}" no es un tipo permitido (${allowed.join(", ")}).`);
  }
  try {
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/blob-upload-token",
    });
    return {
      filename: file.name,
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type || "application/octet-stream",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : `Error al subir "${file.name}".`;
    throw new Error(
      /token|BLOB/i.test(message)
        ? "No se pudo subir: revisa que BLOB_READ_WRITE_TOKEN esté configurado."
        : message
    );
  }
}

// Reduce una foto grande (renders de varios MB) antes de subirla, para que las
// propuestas carguen rápido en el celular. SVG y GIF se suben tal cual.
export async function shrinkImage(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}
