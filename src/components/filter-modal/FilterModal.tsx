import { useState } from "react";
import { X, Search, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import "./FilterModal.css";
import { getAllCountriesWithCodes } from "../../utils/getCountryCode";
import type { FilterState } from "../../types/FilterTypes";
import { defaultFilters } from "../../types/FilterTypes";
import { playConfirm } from "../../utils/sound";

const POSITIONS = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"];
const TIERS = ["legend", "gold", "silver", "bronze"];

const NATIONALITIES = getAllCountriesWithCodes();

const POPULAR_NAMES = ["Brazil", "France", "Argentina", "England", "Portugal", "Spain", "Germany", "Italy", "Netherlands", "Belgium"];

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function FilterModal({ isOpen, onClose, filters, onChange }: FilterModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const currentSort = filters.sortBy || 'desc';

  const handleClose = () => {
    playConfirm(0.4);
    onClose();
  };

  const handleSortChange = (newOrder: 'asc' | 'desc') => {
    onChange({ ...filters, sortBy: newOrder });
  };

  const adjustOverall = (field: 'overallMin' | 'overallMax', amount: number) => {
    const currentValue = filters[field];
    const newValue = Math.min(99, Math.max(1, currentValue + amount));
    onChange({ ...filters, [field]: newValue });
  };

  const clearFilters = () => {
    onChange(defaultFilters);
    setSearchTerm("");
  };

  const isSearching = searchTerm.trim().length > 0;

  const displayedNationalities = NATIONALITIES.filter((nat) => {
    const isSelected = filters.nationalities.includes(nat.name);
    if (isSearching) {
      return nat.name.toLowerCase().startsWith(searchTerm.toLowerCase()) || isSelected;
    }
    return isSelected || POPULAR_NAMES.includes(nat.name);
  }).sort((a, b) => {
    const aSelected = filters.nationalities.includes(a.name);
    const bSelected = filters.nationalities.includes(b.name);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.name.localeCompare(b.name);
  });

  const togglePosition = (pos: string) => {
    const next = filters.positions.includes(pos)
      ? filters.positions.filter(p => p !== pos)
      : [...filters.positions, pos];
    onChange({ ...filters, positions: next });
  };

  const toggleTier = (tier: string) => {
    const next = filters.tiers.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...filters.tiers, tier];
    onChange({ ...filters, tiers: next });
  };

  const toggleNationality = (natName: string) => {
    const next = filters.nationalities.includes(natName)
      ? filters.nationalities.filter(n => n !== natName)
      : [...filters.nationalities, natName];
    onChange({ ...filters, nationalities: next });
  };

  return (
    <div className="filter-modal__overlay" onClick={handleClose}>
      <div className="filter-modal" onClick={e => e.stopPropagation()}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url('/images/ballerstransparent.png')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center 25%',
            backgroundSize: '75%',
            opacity: 0.04,
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <div className="filter-modal__header" style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="filter-modal__title">FILTERS</h2>
          <div className="filter-modal__header-actions">
            <button
              className={`filter-modal__action-btn ${filters.onlyFavorites ? 'filter-modal__action-btn--fav-active' : ''}`}
              type="button"
              onClick={() => onChange({ ...filters, onlyFavorites: !filters.onlyFavorites })}
              title="Favorites"
            >
              <span className="star-icon">★</span>
            </button>

            <button
              className="filter-modal__action-btn"
              type="button"
              onClick={clearFilters}
              title="Refresh Filters"
            >
              <RotateCcw size={21} strokeWidth={2.6} />
            </button>

            <button className="filter-modal__close" onClick={handleClose}>
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="filter-modal__section">
            <h3 className="filter-modal__section-title filter-modal__section-title--overall">
              OVERALL
              <div className="filter-modal__sort-buttons">
                <button
                  type="button"
                  className={`filter-modal__sort-btn ${currentSort === 'desc' ? 'active' : ''}`}
                  onClick={() => handleSortChange('desc')}
                  title="Highest overall first"
                >
                  <ChevronUp size={20} />
                </button>
                <button
                  type="button"
                  className={`filter-modal__sort-btn ${currentSort === 'asc' ? 'active' : ''}`}
                  onClick={() => handleSortChange('asc')}
                  title="Lowest overall first"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            </h3>
            <div className="filter-modal__overall-row">
              <div className="filter-modal__overall-group">
                <div className="filter-modal__overall-input">
                  <label>Min</label>
                  <input
                    type="number"
                    min={1} max={99}
                    value={filters.overallMin}
                    onChange={e => onChange({ ...filters, overallMin: Number(e.target.value.slice(0, 2)) })}
                  />
                </div>
                <div className="filter-modal__overall-shortcuts">
                  <button type="button" onClick={() => adjustOverall('overallMin', -10)}>-10</button>
                  <button type="button" onClick={() => adjustOverall('overallMin', 10)}>+10</button>
                </div>
              </div>

              <span className="filter-modal__overall-sep">—</span>

              <div className="filter-modal__overall-group">
                <div className="filter-modal__overall-input">
                  <label>Max</label>
                  <input
                    type="number"
                    min={1} max={99}
                    value={filters.overallMax}
                    onChange={e => onChange({ ...filters, overallMax: Number(e.target.value.slice(0, 2)) })}
                  />
                </div>
                <div className="filter-modal__overall-shortcuts">
                  <button type="button" onClick={() => adjustOverall('overallMax', -10)}>-10</button>
                  <button type="button" onClick={() => adjustOverall('overallMax', 10)}>+10</button>
                </div>
              </div>
            </div>
          </div>

          <div className="filter-modal__section">
            <h3 className="filter-modal__section-title">TIER</h3>
            <div className="filter-modal__chips">
              {TIERS.map(tier => (
                <button
                  key={tier}
                  className={`filter-modal__chip filter-modal__chip--${tier} ${filters.tiers.includes(tier) ? "filter-modal__chip--active" : ""}`}
                  onClick={() => toggleTier(tier)}
                >
                  {tier.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-modal__section">
            <h3 className="filter-modal__section-title">POSITION</h3>
            <div className="filter-modal__chips">
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  className={`filter-modal__chip ${filters.positions.includes(pos) ? "filter-modal__chip--active" : ""}`}
                  onClick={() => togglePosition(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-modal__section">
            <h3 className="filter-modal__section-title">NATIONALITY</h3>
            <div className="filter-modal__search-wrapper">
              <Search className="filter-modal__search-icon" size={18} />
              <input
                type="text"
                className="filter-modal__search-input"
                placeholder="Search nationality..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-modal__chips filter-modal__chips--nationalities">
              {displayedNationalities.map(nat => (
                <button
                  key={nat.code}
                  className={`filter-modal__chip filter-modal__chip--sm filter-modal__chip--flag ${filters.nationalities.includes(nat.name) ? "filter-modal__chip--active" : ""}`}
                  onClick={() => toggleNationality(nat.name)}
                >
                  <img src={`https://flagcdn.com/w20/${nat.code}.png`} width="20" alt="" className="filter-modal__flag" />
                  <span>{nat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}