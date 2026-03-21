export interface BondingMarket {
  question: string;
  slug: string;
  eventSlug: string;
  probability: number;
  dominantOutcome: string;
  timeRemaining: number;
  endDate: string;
  volume: number;
  volume24hr: number;
  spread: number | null;
  clobTokenIds: string[];
  tags: string[];
}

export type SortField = 'probability' | 'timeRemaining' | 'volume24hr';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'table' | 'card';
export type TimeHorizon = 24 | 48 | 168;
