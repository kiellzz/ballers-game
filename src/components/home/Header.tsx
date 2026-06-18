import { memo, useState } from "react";
import { List, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FilterState } from "../../types/FilterTypes";
import { playButton, playConfirm } from "../../utils/sound";
import PlayMatchModal from "../home/PlayMatchModal";
import "./Header.css";
import Demo from "../demo/Demo";

type HeaderProps = {
  filters: FilterState;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  onCreatePlayer: () => void;
  search: string;
};

function isLineupReady(): boolean {
  try {
    const saved = localStorage.getItem('ballers_saved_progress');
    if (!saved) return false;
    const data = JSON.parse(saved);
    const pitch: (unknown | null)[] = data?.pitch ?? [];
    const bench: (unknown | null)[] = data?.bench ?? [];
    return (
      pitch.length === 11 &&
      pitch.every(p => p !== null) &&
      bench.length > 0 &&
      bench.every(p => p !== null)
    );
  } catch {
    return false;
  }
}

function Header({ filters, search, onSearchChange, onOpenFilters, onCreatePlayer }: HeaderProps) {
  const navigate = useNavigate();
  const [showPlayMatchModal, setShowPlayMatchModal] = useState(false);

  const hasActiveFilters =
    filters.positions.length > 0 ||
    filters.nationalities.length > 0 ||
    filters.tiers.length > 0 ||
    filters.overallMin > 1 ||
    filters.overallMax < 99;

  const handlePlayMatch = () => {
    playConfirm(0.4);
    if (isLineupReady()) {
      navigate("/PreMatch");
    } else {
      setShowPlayMatchModal(true);
    }
  };

  return (
    <header className="header">
      <img src="/images/logo.webp" alt="Ballers logo" className="header__logo" />

      <Demo />

      <div className="header__top">
        <h2 className="header__title">Filters  —  Search for your favorite players!</h2>
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
          aria-label="Create player"
          onMouseEnter={() => playButton(0.3)}
          onClick={() => { playConfirm(0.4); onCreatePlayer(); }}
        >
          <Plus size={22} strokeWidth={2.8} />
        </button>
      </div>

      <div className="header__action-row">
        <button
          className="header__pack-btn"
          type="button"
          onMouseEnter={() => playButton(0.3)}
          onClick={() => { playConfirm(0.4); navigate("/pack-opening"); }}
        >
          <img src="/images/button.png" alt="" className="header__pack-icon" aria-hidden="true" />
          <span>OPEN PACK</span>
        </button>

        <button
          className="header__match-btn"
          type="button"
          onMouseEnter={() => playButton(0.3)}
          onClick={handlePlayMatch}
        >
          <img src="/images/playmatch.png" alt="" className="header__match-icon" aria-hidden="true" />
          <span>PLAY MATCH!</span>
        </button>
      </div>

      {showPlayMatchModal && (
        <PlayMatchModal onClose={() => setShowPlayMatchModal(false)} />
      )}
    </header>
  );
}

export default memo(Header);
