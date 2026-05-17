import { useState, useRef, useEffect } from 'react';
import type { SortField, SortDirection, ViewMode, TimeHorizon } from '../types';

interface FilterBarProps {
  threshold: number;
  onThresholdChange: (v: number) => void;
  horizon: TimeHorizon;
  onHorizonChange: (v: TimeHorizon) => void;
  sortField: SortField;
  onSortFieldChange: (v: SortField) => void;
  sortDir: SortDirection;
  onSortDirChange: (v: SortDirection) => void;
  sortField2: SortField | 'none';
  onSortField2Change: (v: SortField | 'none') => void;
  sortDir2: SortDirection;
  onSortDir2Change: (v: SortDirection) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (v: boolean) => void;
  onRefresh: () => void;
  includeLive: boolean;
  onIncludeLiveChange: (v: boolean) => void;
  allTags: string[];
  excludedTags: Set<string>;
  onExcludedTagsChange: (v: Set<string>) => void;
  marketCount: number;
}

const THRESHOLDS = [90, 95, 99] as const;
const HORIZONS: { value: TimeHorizon; label: string }[] = [
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: 168, label: '7d' },
];

export default function FilterBar({
  threshold, onThresholdChange,
  horizon, onHorizonChange,
  sortField, onSortFieldChange,
  sortDir, onSortDirChange,
  sortField2, onSortField2Change,
  sortDir2, onSortDir2Change,
  viewMode, onViewModeChange,
  autoRefresh, onAutoRefreshChange, onRefresh,
  includeLive, onIncludeLiveChange,
  allTags, excludedTags, onExcludedTagsChange,
  marketCount,
}: FilterBarProps) {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleTag = (tag: string) => {
    const next = new Set(excludedTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    onExcludedTagsChange(next);
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Threshold presets */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide text-center">Threshold</label>
          <div className="flex gap-1">
            {THRESHOLDS.map((t) => (
              <button
                key={t}
                onClick={() => onThresholdChange(t)}
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                  threshold === t
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {t}%+
              </button>
            ))}
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-700" />

        {/* Time horizon */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide text-center">Closing within</label>
          <div className="flex gap-1">
            {HORIZONS.map((h) => (
              <button
                key={h.value}
                onClick={() => onHorizonChange(h.value)}
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                  horizon === h.value
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-700" />

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="space-y-2" ref={tagRef}>
            <label className="block text-xs text-gray-400 uppercase tracking-wide text-center">
              Tags{excludedTags.size > 0 && ` (${allTags.length - excludedTags.size}/${allTags.length})`}
            </label>
            <div className="relative">
              <button
                onClick={() => setTagDropdownOpen((o) => !o)}
                className={`px-3 py-1.5 text-sm rounded font-medium border flex items-center gap-1 transition-colors ${
                  excludedTags.size > 0
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                }`}
              >
                {excludedTags.size === 0 ? 'All tags' : `${allTags.length - excludedTags.size} selected`}
                <span className="text-xs ml-1">{tagDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {tagDropdownOpen && (
                <div className="absolute z-50 mt-1 w-56 max-h-64 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                  <div className="p-2 border-b border-gray-700 flex gap-2">
                    <button
                      onClick={() => onExcludedTagsChange(new Set())}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      All
                    </button>
                    <button
                      onClick={() => onExcludedTagsChange(new Set(allTags))}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      None
                    </button>
                  </div>
                  {allTags.map((tag) => (
                    <label
                      key={tag}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 cursor-pointer text-sm text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={!excludedTags.has(tag)}
                        onChange={() => toggleTag(tag)}
                        className="rounded border-gray-600"
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="hidden sm:block w-px h-8 bg-gray-700" />

        {/* Sort */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide text-center">Sort by</label>
          <div className="flex gap-1 items-center">
            <select
              value={sortField}
              onChange={(e) => onSortFieldChange(e.target.value as SortField)}
              className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1.5 border border-gray-700"
            >
              <option value="probability">Probability</option>
              <option value="timeRemaining">Time Left</option>
              <option value="volume24hr">24h Volume</option>
            </select>
            <button
              onClick={() => onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')}
              className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1.5 border border-gray-700 hover:bg-gray-700"
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
            <span className="text-gray-600 text-xs">then</span>
            <select
              value={sortField2}
              onChange={(e) => onSortField2Change(e.target.value as SortField | 'none')}
              className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1.5 border border-gray-700"
            >
              <option value="none">—</option>
              <option value="probability">Probability</option>
              <option value="timeRemaining">Time Left</option>
              <option value="volume24hr">24h Volume</option>
            </select>
            {sortField2 !== 'none' && (
              <button
                onClick={() => onSortDir2Change(sortDir2 === 'asc' ? 'desc' : 'asc')}
                className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1.5 border border-gray-700 hover:bg-gray-700"
              >
                {sortDir2 === 'asc' ? '↑' : '↓'}
              </button>
            )}
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-700" />

        {/* View mode */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide text-center">View</label>
          <div className="flex gap-1">
            <button
              onClick={() => onViewModeChange('table')}
              className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => onViewModeChange('card')}
              className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                viewMode === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Cards
            </button>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-700" />

        {/* Auto-refresh */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide text-center">Auto-refresh</label>
          <div className="flex gap-1">
            <button
              onClick={() => onAutoRefreshChange(!autoRefresh)}
              className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {autoRefresh ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5" />On (30s)</> : 'Off'}
            </button>
            <button
              onClick={onRefresh}
              title="Refresh now"
              className="px-2.5 py-1.5 text-sm rounded font-medium transition-colors bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              ↻
            </button>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-700" />

        {/* Include live */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide text-center">Include Live</label>
          <button
            onClick={() => onIncludeLiveChange(!includeLive)}
            className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
              includeLive
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {includeLive ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse mr-1.5" />On</> : 'Off'}
          </button>
        </div>

        {/* Market count */}
        <div className="ml-auto">
          <span className="text-sm px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 cursor-help" title="Markets matching your current threshold, time horizon, and tag filters">
            <span className="text-white font-medium">{marketCount}</span> markets
          </span>
        </div>
      </div>
    </div>
  );
}
