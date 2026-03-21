import type { BondingMarket, SortField, SortDirection } from '../types';
import { formatTimeRemaining, formatVolume, probabilityColor, probabilityBorderLeft, spreadColor } from '../lib/format';

interface MarketTableProps {
  markets: BondingMarket[];
  sortField: SortField;
  sortDir: SortDirection;
  onSort: (field: SortField) => void;
}

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const active = field === currentField;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer select-none transition-colors ${active ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
    >
      {label}
      <span className={`ml-1 ${active ? 'text-blue-400' : 'text-gray-600'}`}>
        {active ? (currentDir === 'asc' ? '▲' : '▼') : '▽'}
      </span>
    </th>
  );
}

export default function MarketTable({ markets, sortField, sortDir, onSort }: MarketTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full">
        <thead className="border-b border-gray-800 bg-gray-900/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
              Market
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
              Outcome
            </th>
            <SortHeader label="Probability" field="probability" currentField={sortField} currentDir={sortDir} onSort={onSort} />
            <SortHeader label="Time Left" field="timeRemaining" currentField={sortField} currentDir={sortDir} onSort={onSort} />
            <SortHeader label="24h Volume" field="volume24hr" currentField={sortField} currentDir={sortDir} onSort={onSort} />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
              Spread
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {markets.map((m, i) => {
            const pctStr = (m.probability * 100).toFixed(2) + '%';
            const url = m.eventSlug ? `https://polymarket.com/event/${m.eventSlug}` : '#';
            return (
              <tr
                key={m.slug + i}
                onClick={() => window.open(url, '_blank')}
                className={`even:bg-gray-900/50 hover:bg-gray-800/50 transition-colors cursor-pointer ${probabilityBorderLeft(m.probability)}`}
              >
                <td className="px-4 py-3 min-w-[280px] max-w-md">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-200 hover:text-blue-400 hover:underline decoration-blue-400/40 underline-offset-2 line-clamp-2"
                  >
                    {m.question}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                    {m.dominantOutcome}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  <span className={`text-sm font-bold ${probabilityColor(m.probability)}`}>
                    {pctStr}
                  </span>
                </td>
                <td className={`px-4 py-3 text-sm tabular-nums ${m.timeRemaining < 6 * 60 * 60 * 1000 ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
                  {formatTimeRemaining(m.timeRemaining)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300 tabular-nums">
                  {formatVolume(m.volume24hr)}
                </td>
                <td className={`px-4 py-3 text-sm tabular-nums ${spreadColor(m.spread)}`}>
                  {m.spread != null ? `${(m.spread * 100).toFixed(1)}¢` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
