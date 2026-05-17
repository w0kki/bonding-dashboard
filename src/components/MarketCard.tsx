import type { BondingMarket } from '../types';
import { formatTimeRemaining, formatVolume, probabilityColor, probabilityBg, probabilityBorderTop, spreadColor } from '../lib/format';

interface MarketCardProps {
  market: BondingMarket;
}

export default function MarketCard({ market }: MarketCardProps) {
  const pctStr = (market.probability * 100).toFixed(2) + '%';
  const url = market.eventSlug ? `https://polymarket.com/event/${market.eventSlug}` : '#';

  const openMarket = () => {
    fetch(`http://localhost:3333/open?url=${encodeURIComponent(url)}`)
      .catch(() => window.open(url, '_blank'));
  };

  return (
    <div
      onClick={openMarket}
      className={`block border rounded-lg p-4 transition-all duration-200 hover:border-gray-600 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 cursor-pointer ${probabilityBg(market.probability)} ${probabilityBorderTop(market.probability)}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-medium text-gray-100 leading-snug line-clamp-2">
          {market.question}
        </h3>
        <span className={`text-lg font-bold whitespace-nowrap tabular-nums ${probabilityColor(market.probability)}`}>
          {pctStr}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
          {market.dominantOutcome}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 tabular-nums">
        <div>
          <div className="text-gray-500">Time Left</div>
          <div className={market.timeRemaining < 6 * 60 * 60 * 1000 ? 'text-red-400 font-medium' : 'text-gray-200'}>{formatTimeRemaining(market.timeRemaining)}</div>
        </div>
        <div>
          <div className="text-gray-500">24h Vol</div>
          <div className="text-gray-200">{formatVolume(market.volume24hr)}</div>
        </div>
        <div>
          <div className="text-gray-500">Spread</div>
          <div className={spreadColor(market.spread)}>{market.spread != null ? `${(market.spread * 100).toFixed(1)}¢` : '—'}</div>
        </div>
      </div>
    </div>
  );
}
