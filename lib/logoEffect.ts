export function buildLogoFilter(effect: string, color: string, intensity: number): string {
  if (!effect || effect === 'none' || !color) return 'none';
  const px = Math.max(1, intensity);
  if (effect === 'glow') {
    return [
      `drop-shadow(0 0 ${px}px ${color})`,
      `drop-shadow(0 0 ${Math.round(px * 1.8)}px ${color})`,
      `drop-shadow(0 0 ${Math.round(px * 3)}px ${color}80)`,
    ].join(' ');
  }
  if (effect === 'shadow') {
    return `drop-shadow(${Math.round(px * 0.3)}px ${Math.round(px * 0.5)}px ${Math.round(px * 0.6)}px ${color}cc)`;
  }
  if (effect === 'outline') {
    const s = Math.max(1, Math.round(px * 0.4));
    return [
      `drop-shadow(${s}px 0 0 ${color})`,
      `drop-shadow(-${s}px 0 0 ${color})`,
      `drop-shadow(0 ${s}px 0 ${color})`,
      `drop-shadow(0 -${s}px 0 ${color})`,
    ].join(' ');
  }
  return 'none';
}
