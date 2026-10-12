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
