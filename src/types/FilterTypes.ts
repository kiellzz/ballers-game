export interface FilterState {
  overallMin: number;
  overallMax: number;
  tiers: string[];
  positions: string[];
  nationalities: string[];
  onlyFavorites: boolean;
  sortBy?: 'asc' | 'desc'; 
}

export const defaultFilters: FilterState = {
  overallMin: 1,
  overallMax: 99,
  tiers: [],
  positions: [],
  nationalities: [],
  onlyFavorites: false,
  sortBy: 'desc'
};
