import {
  DEFAULT_IMAGE_EDIT_SETTINGS,
  exportEditedImageFile,
  loadImageFromFile,
  releaseLoadedImage,
  renderEditedImage,
  type ImageEditSettings,
} from '@/lib/imageEdit';
import { compressImageFile, compressImageFromCanvas } from '@/lib/imageCompress';

/** Auto-enhance without manual crop (multi-page or batch). */
export async function autoPrepareImageFile(file: File): Promise<File> {
  const settings: ImageEditSettings = {
    ...DEFAULT_IMAGE_EDIT_SETTINGS,
    brightness: 1.05,
    contrast: 1.12,
    hdr: true,
  };
  const image = await loadImageFromFile(file);
  try {
    const canvas = await renderEditedImage(image, settings);
    const compressed = await compressImageFromCanvas(canvas, file.name);
    return compressed;
  } finally {
    releaseLoadedImage(image);
  }
}

/** After user crop/enhance — compress for vault storage. */
export async function prepareEditedImageFile(
  file: File,
  settings: ImageEditSettings,
): Promise<File> {
  const image = await loadImageFromFile(file);
  try {
    const edited = await exportEditedImageFile(image, settings, file.name);
    return compressImageFile(edited);
  } finally {
    releaseLoadedImage(image);
  }
}
