import { useState, useEffect, useCallback, useRef } from 'react';
import type { BondingMarket, SortField, SortDirection, ViewMode, TimeHorizon } from './types';
import { fetchBondingMarkets } from './lib/polymarket';
import type { FetchProgress } from './lib/polymarket';
import FilterBar from './components/FilterBar';
import SearchBar from './components/SearchBar';
import MarketGrid from './components/MarketGrid';
import YfmLogo from './components/YfmLogo';

const REFRESH_INTERVAL = 30_000;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function App() {
  const [threshold, setThreshold] = useState<number>(() => load('threshold', 95));
  const [horizon, setHorizon] = useState<TimeHorizon>(() => load('horizon', 48));
  const [sortField, setSortField] = useState<SortField>(() => load('sortField', 'probability'));
  const [sortDir, setSortDir] = useState<SortDirection>(() => load('sortDir', 'desc'));
  const [sortField2, setSortField2] = useState<SortField | 'none'>(() => load('sortField2', 'none'));
  const [sortDir2, setSortDir2] = useState<SortDirection>(() => load('sortDir2', 'asc'));
  const [viewMode, setViewMode] = useState<ViewMode>(() => load('viewMode', 'table'));
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => load('autoRefresh', true));
  const [includeLive, setIncludeLive] = useState<boolean>(() => load('includeLive', false));
  const [excludedTags, setExcludedTags] = useState<Set<string>>(
    () => new Set<string>(load<string[]>('excludedTags', []))
  );
  const [search, setSearch] = useState('');

  const [markets, setMarkets] = useState<BondingMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persist settings to localStorage whenever they change
  useEffect(() => save('threshold', threshold), [threshold]);
  useEffect(() => save('horizon', horizon), [horizon]);
  useEffect(() => save('sortField', sortField), [sortField]);
  useEffect(() => save('sortDir', sortDir), [sortDir]);
  useEffect(() => save('sortField2', sortField2), [sortField2]);
  useEffect(() => save('sortDir2', sortDir2), [sortDir2]);
  useEffect(() => save('viewMode', viewMode), [viewMode]);
  useEffect(() => save('autoRefresh', autoRefresh), [autoRefresh]);
  useEffect(() => save('includeLive', includeLive), [includeLive]);
  useEffect(() => save('excludedTags', [...excludedTags]), [excludedTags]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMarkets = useCallback(async (showProgress = false) => {
    try {
      setError(null);
      const data = await fetchBondingMarkets(
        threshold,
        horizon,
        showProgress ? setProgress : undefined,
        includeLive,
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
  }, [threshold, horizon, includeLive]);

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

  // Polymarket sports events use many subtags instead of a generic "Sports" tag.
  // We map all of them into the Sports bucket so the tag filter works correctly.
  const SPORTS_SUBTAGS = new Set([
    'soccer', 'football', 'nfl', 'nba', 'nhl', 'mlb', 'basketball', 'baseball',
    'hockey', 'tennis', 'golf', 'boxing', 'mma', 'ufc', 'f1', 'racing', 'nascar',
    'rugby', 'cricket', 'esports', 'games', 'olympics', 'ncaa', 'college football',
    'college basketball', 'wnba', 'pga',
  ]);

  const bucketFor = (tags: string[]): string => {
    const lower = tags.map((t) => t.toLowerCase());
    if (lower.some((t) => t === 'crypto')) return 'Crypto';
    if (lower.some((t) => t === 'politics')) return 'Politics';
    if (lower.some((t) => t === 'sports' || SPORTS_SUBTAGS.has(t))) return 'Sports';
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
    const primary = sortDir === 'asc' ? cmp : -cmp;
    if (primary !== 0 || sortField2 === 'none') return primary;
    const aVal2 = a[sortField2];
    const bVal2 = b[sortField2];
    const cmp2 = aVal2 < bVal2 ? -1 : aVal2 > bVal2 ? 1 : 0;
    return sortDir2 === 'asc' ? cmp2 : -cmp2;
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMarkets(true);
    setIsRefreshing(false);
  }, [loadMarkets]);

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
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2.5">
              <YfmLogo />
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Bonding Dashboard</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
              <span className="text-white font-medium">{sorted.length}</span> markets
            </span>
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
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
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
          sortField2={sortField2}
          onSortField2Change={setSortField2}
          sortDir2={sortDir2}
          onSortDir2Change={setSortDir2}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          includeLive={includeLive}
          onIncludeLiveChange={setIncludeLive}
          allTags={allTags}
          excludedTags={excludedTags}
          onExcludedTagsChange={setExcludedTags}
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
