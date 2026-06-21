export type UploadNavigationState = {
  pickedFile?: File;
};

export function uploadPathWithCamera(basePath: string): string {
  return `${basePath}${basePath.includes('?') ? '&' : '?'}source=camera`;
}
