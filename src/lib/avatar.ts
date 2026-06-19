const AVATAR_GRADIENTS = [
  'from-[#8B857C] to-[#6B6560]',
  'from-[#5A7A6B] to-[#3D5549]',
  'from-[#7A6B8F] to-[#524760]',
  'from-[#B8860B] to-[#8A6510]',
  'from-[#6B7C8F] to-[#4A5568]',
];

export function memberAvatarGradient(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(name.length - 1) ?? 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length]!;
}
