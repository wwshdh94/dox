import type { DocType } from '@/types';

export type UploadNavigationState = {
  pickedFile?: File;
};

export function uploadPathWithCamera(basePath: string): string {
  return `${basePath}${basePath.includes('?') ? '&' : '?'}source=camera`;
}

export function initialDocTypeFromUploadParams(params: URLSearchParams): DocType {
  if (params.get('type') === 'purchase') return 'purchase_receipt';
  if (params.get('context') === 'health') return 'health_insurance';
  const type = params.get('type');
  if (type === 'passport' || type === 'pan' || type === 'aadhaar') return type;
  return 'passport';
}

export function initialMemberIdFromUploadParams(
  params: URLSearchParams,
  members: { id: string; role?: string }[],
): string {
  const fromQuery = params.get('member');
  if (fromQuery) return fromQuery;
  return members.find((m) => m.role === 'owner')?.id ?? members[0]?.id ?? '';
}
