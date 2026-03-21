import type { BondingMarket, SortField, SortDirection, ViewMode } from '../types';
import MarketTable from './MarketTable';
import MarketCard from './MarketCard';
import YfmLogo from './YfmLogo';

interface MarketGridProps {
  markets: BondingMarket[];
  viewMode: ViewMode;
  sortField: SortField;
  sortDir: SortDirection;
  onSort: (field: SortField) => void;
}

export default function MarketGrid({ markets, viewMode, sortField, sortDir, onSort }: MarketGridProps) {
  if (markets.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <YfmLogo size="lg" className="mb-6 opacity-40" />
        <p className="text-lg">No opportunities found</p>
        <p className="text-sm mt-1">Try lowering the threshold or expanding the time horizon.</p>
      </div>
    );
  }

  if (viewMode === 'table') {
    return <div className="animate-fade-in"><MarketTable markets={markets} sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {markets.map((m, i) => (
        <MarketCard key={m.slug + i} market={m} />
      ))}
    </div>
  );
}
