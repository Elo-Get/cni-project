export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export async function fileToBlob(file: File): Promise<Blob> {
  return file;
}

export function revokeObjectUrl(url?: string | null) {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}
