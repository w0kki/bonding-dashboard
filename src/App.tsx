import { useState, useEffect, useCallback, useRef } from 'react';
import type { BondingMarket, SortField, SortDirection, ViewMode, TimeHorizon } from './types';
import { fetchBondingMarkets } from './lib/polymarket';
import type { FetchProgress } from './lib/polymarket';
import FilterBar from './components/FilterBar';
import SearchBar from './components/SearchBar';
import MarketGrid from './components/MarketGrid';
import YfmLogo from './components/YfmLogo';

const REFRESH_INTERVAL = 30_000;

export default function App() {
  const [threshold, setThreshold] = useState(95);
  const [horizon, setHorizon] = useState<TimeHorizon>(48);
  const [sortField, setSortField] = useState<SortField>('probability');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [excludedTags, setExcludedTags] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const [markets, setMarkets] = useState<BondingMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [progress, setProgress] = useState<FetchProgress | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMarkets = useCallback(async (showProgress = false) => {
    try {
      setError(null);
      const data = await fetchBondingMarkets(
        threshold,
        horizon,
        showProgress ? setProgress : undefined,
      );
      setMarkets(data);
      setLastUpdated(new Date());
    } catch (err) {
      if (markets.length === 0) {
        setError(err instanceof Error ? err.message : 'Failed to fetch markets');
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [threshold, horizon]);

  useEffect(() => {
    setLoading(true);
    loadMarkets(true);
  }, [loadMarkets]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(loadMarkets, REFRESH_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, loadMarkets]);

  const TAG_BUCKETS = ['Crypto', 'Politics', 'Sports'] as const;
  const allTags = [...TAG_BUCKETS, 'Other'];

  const bucketFor = (tags: string[]): string => {
    for (const b of TAG_BUCKETS) {
      if (tags.some((t) => t.toLowerCase() === b.toLowerCase())) return b;
    }
    return 'Other';
  };

  const searchLower = search.toLowerCase();
  const filtered = markets.filter((m) => {
    if (excludedTags.size > 0 && excludedTags.has(bucketFor(m.tags))) return false;
    if (searchLower && !m.question.toLowerCase().includes(searchLower)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2.5">
              <YfmLogo />
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Bonding Dashboard</span>
            </h1>
          </div>
          {lastUpdated && (
            <span
              key={lastUpdated.getTime()}
              className="text-xs text-gray-500 cursor-help animate-flash-update px-3 py-1 rounded-full bg-gray-800/50 border border-gray-800"
              title="Last time market data was refreshed from Polymarket"
            >
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <SearchBar value={search} onChange={setSearch} />

        <FilterBar
          threshold={threshold}
          onThresholdChange={setThreshold}
          horizon={horizon}
          onHorizonChange={setHorizon}
          sortField={sortField}
          onSortFieldChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          allTags={allTags}
          excludedTags={excludedTags}
          onExcludedTagsChange={setExcludedTags}
          marketCount={sorted.length}
        />

        {loading && markets.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <YfmLogo size="lg" className="mb-6 animate-spin-3d" />
            {progress && (
              <div className="max-w-xs mx-auto space-y-2">
                <div className="text-sm">
                  {progress.phase === 'fetching'
                    ? `Scanning markets... (${progress.loaded} found)`
                    : 'Filtering opportunities...'}
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-300"
                    style={{
                      width: progress.phase === 'processing'
                        ? '100%'
                        : `${Math.min(95, progress.page * 20)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <YfmLogo size="lg" className="mb-6 opacity-30" />
            <div className="text-red-400 font-medium mb-1">Something went wrong</div>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={loadMarkets}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <MarketGrid
            markets={sorted}
            viewMode={viewMode}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}
      </main>

      <footer className="border-t border-gray-800 px-4 sm:px-6 py-4 mt-8">
        <p className="text-center text-xs text-gray-600">
          Data from Polymarket. Not financial advice. For informational purposes only.
        </p>
      </footer>
    </div>
  );
}
