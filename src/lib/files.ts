export function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function isPdfFile(fileName?: string, fileDataUrl?: string): boolean {
  if (fileDataUrl?.startsWith('data:application/pdf')) return true;
  return !!fileName?.toLowerCase().endsWith('.pdf');
}

export function isImageFile(fileName?: string, fileDataUrl?: string): boolean {
  if (fileDataUrl?.startsWith('data:image/')) return true;
  return !!fileName?.match(/\.(jpe?g|png|webp|gif|heic|heif)$/i);
}
