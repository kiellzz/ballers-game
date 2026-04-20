import { List, RotateCcw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FilterState } from "../../types/FilterTypes";
import { playButton, playConfirm } from "../../utils/sound";
import "./Header.css";

type HeaderProps = {
  filters: FilterState;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  search: string;
};

export default function Header({ filters, search, onSearchChange, onOpenFilters, onClearFilters }: HeaderProps) {
  const navigate = useNavigate();

  const hasActiveFilters =
    filters.positions.length > 0 ||
    filters.nationalities.length > 0 ||
    filters.tiers.length > 0 ||
    filters.overallMin > 1 ||
    filters.overallMax < 99;

  return (
    <header className="header">
      <img src="/images/logo.webp" alt="Ballers logo" className="header__logo" />

      <div className="header__top">
        <h2 className="header__title">Filters</h2>
      </div>

      <div className="header__controls">
        <button
          className={`header__icon-btn ${hasActiveFilters ? "header__icon-btn--active" : ""}`}
          type="button"
          aria-label="Open filters"
          onMouseEnter={() => playButton(0.3)}
          onClick={() => { playConfirm(0.4); onOpenFilters(); }}
        >
          <List size={26} strokeWidth={2.4} />
          {hasActiveFilters && <span className="header__filter-dot" />}
        </button>

        <div className="header__search">
          <Search size={18} strokeWidth={2.4} className="header__search-icon" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        <button
          className="header__action-btn"
          type="button"
          aria-label="Field view"
          onMouseEnter={() => playButton(0.3)}
          onClick={() => { playConfirm(0.4); navigate("/lineup"); }}
        >
          <img src="/images/field.png" alt="field" className="header__field-icon" />
        </button>

        <button
          className="header__action-btn"
          type="button"
          aria-label="Clear filters"
          onMouseEnter={() => playButton(0.3)}
          onClick={() => { playConfirm(0.4); onClearFilters(); }}
        >
          <RotateCcw size={21} strokeWidth={2.6} />
        </button>
      </div>

      <button
        className="header__pack-btn"
        type="button"
        onMouseEnter={() => playButton(0.3)}
        onClick={() => { playConfirm(0.4); navigate("/pack-opening"); }}
      >
        <img src="/images/button.png" alt="" className="header__pack-icon" aria-hidden="true" />
        <span>OPEN PACK</span>
      </button>
    </header>
  );
}
