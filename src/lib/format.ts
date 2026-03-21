export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function probabilityColor(p: number): string {
  if (p >= 0.99) return 'text-green-400';
  if (p >= 0.95) return 'text-yellow-400';
  return 'text-orange-400';
}

export function probabilityBg(p: number): string {
  if (p >= 0.99) return 'bg-green-400/10 border-green-400/30';
  if (p >= 0.95) return 'bg-yellow-400/10 border-yellow-400/30';
  return 'bg-orange-400/10 border-orange-400/30';
}

export function spreadColor(spread: number | null): string {
  if (spread == null) return 'text-gray-500';
  if (spread <= 0.02) return 'text-green-400';
  if (spread <= 0.05) return 'text-yellow-400';
  return 'text-orange-400';
}

export function probabilityBorderLeft(p: number): string {
  if (p >= 0.99) return 'border-l-2 border-l-green-400/60';
  if (p >= 0.95) return 'border-l-2 border-l-yellow-400/60';
  return 'border-l-2 border-l-orange-400/60';
}

export function probabilityBorderTop(p: number): string {
  if (p >= 0.99) return 'border-t-2 border-t-green-400/60';
  if (p >= 0.95) return 'border-t-2 border-t-yellow-400/60';
  return 'border-t-2 border-t-orange-400/60';
}
