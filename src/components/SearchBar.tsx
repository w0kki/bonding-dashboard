import { useRef, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('');
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onChange]);

  return (
    <div className="relative group">
      <svg
        className={`absolute z-10 left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none transition-opacity duration-200 ${value ? 'opacity-0' : 'opacity-100'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search markets..."
        className="search-input w-full bg-gray-800/60 backdrop-blur-sm text-gray-200 text-sm rounded-xl pl-14 pr-16 py-2.5 placeholder-gray-600 transition-all duration-200 focus:scale-[1.01] origin-center"
      />
      <div className="absolute z-10 right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <button
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className={`text-gray-500 hover:text-gray-300 transition-opacity duration-200 ${value ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <kbd className={`text-[10px] text-gray-500 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono transition-opacity duration-200 ${value ? 'opacity-0' : 'opacity-100'}`}>/</kbd>
      </div>
    </div>
  );
}
