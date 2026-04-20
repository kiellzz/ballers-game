import { useState } from "react";
import { X, Search, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import "./FilterModal.css";

import type { FilterState } from "../../types/FilterTypes";
import { defaultFilters } from "../../types/FilterTypes";
import { playConfirm } from "../../utils/sound";

const POSITIONS = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"];
const TIERS = ["legend", "gold", "silver", "bronze"];

const NATIONALITIES = [
  { name: "Afghanistan", code: "af" }, { name: "Albania", code: "al" }, { name: "Algeria", code: "dz" },
  { name: "American Samoa", code: "as" }, { name: "Andorra", code: "ad" }, { name: "Angola", code: "ao" },
  { name: "Anguilla", code: "ai" }, { name: "Antarctica", code: "aq" }, { name: "Antigua and Barbuda", code: "ag" },
  { name: "Argentina", code: "ar" }, { name: "Armenia", code: "am" }, { name: "Aruba", code: "aw" },
  { name: "Australia", code: "au" }, { name: "Austria", code: "at" }, { name: "Azerbaijan", code: "az" },
  { name: "Bahamas", code: "bs" }, { name: "Bahrain", code: "bh" }, { name: "Bangladesh", code: "bd" },
  { name: "Barbados", code: "bb" }, { name: "Belarus", code: "by" }, { name: "Belgium", code: "be" },
  { name: "Belize", code: "bz" }, { name: "Benin", code: "bj" }, { name: "Bermuda", code: "bm" },
  { name: "Bhutan", code: "bt" }, { name: "Bolivia", code: "bo" }, { name: "Bosnia and Herzegovina", code: "ba" },
  { name: "Botswana", code: "bw" }, { name: "Brazil", code: "br" }, { name: "British Indian Ocean Territory", code: "io" },
  { name: "British Virgin Islands", code: "vg" }, { name: "Brunei", code: "bn" }, { name: "Bulgaria", code: "bg" },
  { name: "Burkina Faso", code: "bf" }, { name: "Burundi", code: "bi" }, { name: "Cambodia", code: "kh" },
  { name: "Cameroon", code: "cm" }, { name: "Canada", code: "ca" }, { name: "Cape Verde", code: "cv" },
  { name: "Cayman Islands", code: "ky" }, { name: "Central African Republic", code: "cf" }, { name: "Chad", code: "td" },
  { name: "Chile", code: "cl" }, { name: "China", code: "cn" }, { name: "Christmas Island", code: "cx" },
  { name: "Cocos Islands", code: "cc" }, { name: "Colombia", code: "co" }, { name: "Comoros", code: "km" },
  { name: "Cook Islands", code: "ck" }, { name: "Costa Rica", code: "cr" }, { name: "Croatia", code: "hr" },
  { name: "Cuba", code: "cu" }, { name: "Curacao", code: "cw" }, { name: "Cyprus", code: "cy" },
  { name: "Czech Republic", code: "cz" }, { name: "Democratic Republic of the Congo", code: "cd" }, { name: "Denmark", code: "dk" },
  { name: "Djibouti", code: "dj" }, { name: "Dominica", code: "dm" }, { name: "Dominican Republic", code: "do" },
  { name: "East Timor", code: "tl" }, { name: "Ecuador", code: "ec" }, { name: "Egypt", code: "eg" },
  { name: "El Salvador", code: "sv" }, { name: "England", code: "gb-eng" }, { name: "Equatorial Guinea", code: "gq" },
  { name: "Eritrea", code: "er" }, { name: "Estonia", code: "ee" }, { name: "Ethiopia", code: "et" },
  { name: "Falkland Islands", code: "fk" }, { name: "Faroe Islands", code: "fo" }, { name: "Fiji", code: "fj" },
  { name: "Finland", code: "fi" }, { name: "France", code: "fr" }, { name: "French Polynesia", code: "pf" },
  { name: "Gabon", code: "ga" }, { name: "Gambia", code: "gm" }, { name: "Georgia", code: "ge" },
  { name: "Germany", code: "de" }, { name: "Ghana", code: "gh" }, { name: "Gibraltar", code: "gi" },
  { name: "Greece", code: "gr" }, { name: "Greenland", code: "gl" }, { name: "Grenada", code: "gd" },
  { name: "Guam", code: "gu" }, { name: "Guatemala", code: "gt" }, { name: "Guernsey", code: "gg" },
  { name: "Guinea", code: "gn" }, { name: "Guinea-Bissau", code: "gw" }, { name: "Guyana", code: "gy" },
  { name: "Haiti", code: "ht" }, { name: "Honduras", code: "hn" }, { name: "Hong Kong", code: "hk" },
  { name: "Hungary", code: "hu" }, { name: "Iceland", code: "is" }, { name: "India", code: "in" },
  { name: "Indonesia", code: "id" }, { name: "Iran", code: "ir" }, { name: "Iraq", code: "iq" },
  { name: "Ireland", code: "ie" }, { name: "Isle of Man", code: "im" }, { name: "Israel", code: "il" },
  { name: "Italy", code: "it" }, { name: "Ivory Coast", code: "ci" }, { name: "Jamaica", code: "jm" },
  { name: "Japan", code: "jp" }, { name: "Jersey", code: "je" }, { name: "Jordan", code: "jo" },
  { name: "Kazakhstan", code: "kz" }, { name: "Kenya", code: "ke" }, { name: "Kiribati", code: "ki" },
  { name: "Kosovo", code: "xk" }, { name: "Kuwait", code: "kw" }, { name: "Kyrgyzstan", code: "kg" },
  { name: "Laos", code: "la" }, { name: "Latvia", code: "lv" }, { name: "Lebanon", code: "lb" },
  { name: "Lesotho", code: "ls" }, { name: "Liberia", code: "lr" }, { name: "Libya", code: "ly" },
  { name: "Liechtenstein", code: "li" }, { name: "Lithuania", code: "lt" }, { name: "Luxembourg", code: "lu" },
  { name: "Macau", code: "mo" }, { name: "Macedonia", code: "mk" }, { name: "Madagascar", code: "mg" },
  { name: "Malawi", code: "mw" }, { name: "Malaysia", code: "my" }, { name: "Maldives", code: "mv" },
  { name: "Mali", code: "ml" }, { name: "Malta", code: "mt" }, { name: "Marshall Islands", code: "mh" },
  { name: "Mauritania", code: "mr" }, { name: "Mauritius", code: "mu" }, { name: "Mayotte", code: "yt" },
  { name: "Mexico", code: "mx" }, { name: "Micronesia", code: "fm" }, { name: "Moldova", code: "md" },
  { name: "Monaco", code: "mc" }, { name: "Mongolia", code: "mn" }, { name: "Montenegro", code: "me" },
  { name: "Montserrat", code: "ms" }, { name: "Morocco", code: "ma" }, { name: "Mozambique", code: "mz" },
  { name: "Myanmar", code: "mm" }, { name: "Namibia", code: "na" }, { name: "Nauru", code: "nr" },
  { name: "Nepal", code: "np" }, { name: "Netherlands", code: "nl" }, { name: "New Caledonia", code: "nc" },
  { name: "New Zealand", code: "nz" }, { name: "Nicaragua", code: "ni" }, { name: "Niger", code: "ne" },
  { name: "Nigeria", code: "ng" }, { name: "Niue", code: "nu" }, { name: "North Korea", code: "kp" },
  { name: "Northern Mariana Islands", code: "mp" }, { name: "Northern Ireland", code: "gb-nir" }, { name: "Norway", code: "no" }, { name: "Oman", code: "om" },
  { name: "Pakistan", code: "pk" }, { name: "Palau", code: "pw" }, { name: "Palestine", code: "ps" },
  { name: "Panama", code: "pa" }, { name: "Papua New Guinea", code: "pg" }, { name: "Paraguay", code: "py" },
  { name: "Peru", code: "pe" }, { name: "Philippines", code: "ph" }, { name: "Poland", code: "pl" },
  { name: "Portugal", code: "pt" }, { name: "Puerto Rico", code: "pr" }, { name: "Qatar", code: "qa" },
  { name: "Republic of the Congo", code: "cg" }, { name: "Reunion", code: "re" }, { name: "Romania", code: "ro" },
  { name: "Russia", code: "ru" }, { name: "Rwanda", code: "rw" }, { name: "Saint Kitts and Nevis", code: "kn" },
  { name: "Saint Lucia", code: "lc" }, { name: "Saint Pierre and Miquelon", code: "pm" }, { name: "Saint Vincent and the Grenadines", code: "vc" },
  { name: "Samoa", code: "ws" }, { name: "San Marino", code: "sm" }, { name: "Sao Tome and Principe", code: "st" },
  { name: "Saudi Arabia", code: "sa" }, { name: "Scotland", code: "gb-sct" }, { name: "Senegal", code: "sn" },
  { name: "Serbia", code: "rs" }, { name: "Seychelles", code: "sc" }, { name: "Sierra Leone", code: "sl" },
  { name: "Singapore", code: "sg" }, { name: "Sint Maarten", code: "sx" }, { name: "Slovakia", code: "sk" },
  { name: "Slovenia", code: "si" }, { name: "Solomon Islands", code: "sb" }, { name: "Somalia", code: "so" },
  { name: "South Africa", code: "za" }, { name: "South Korea", code: "kr" }, { name: "South Sudan", code: "ss" },
  { name: "Spain", code: "es" }, { name: "Sri Lanka", code: "lk" }, { name: "Sudan", code: "sd" },
  { name: "Suriname", code: "sr" }, { name: "Svalbard and Jan Mayen", code: "sj" }, { name: "Swaziland", code: "sz" },
  { name: "Sweden", code: "se" }, { name: "Switzerland", code: "ch" }, { name: "Syria", code: "sy" },
  { name: "Taiwan", code: "tw" }, { name: "Tajikistan", code: "tj" }, { name: "Tanzania", code: "tz" },
  { name: "Thailand", code: "th" }, { name: "Togo", code: "tg" }, { name: "Tokelau", code: "tk" },
  { name: "Tonga", code: "to" }, { name: "Trinidad and Tobago", code: "tt" }, { name: "Tunisia", code: "tn" },
  { name: "Turkey", code: "tr" }, { name: "Turkmenistan", code: "tm" }, { name: "Turks and Caicos Islands", code: "tc" },
  { name: "Tuvalu", code: "tv" }, { name: "U.S. Virgin Islands", code: "vi" }, { name: "Uganda", code: "ug" },
  { name: "Ukraine", code: "ua" }, { name: "United Arab Emirates", code: "ae" }, { name: "United Kingdom", code: "gb" },
  { name: "United States", code: "us" }, { name: "Uruguay", code: "uy" }, { name: "Uzbekistan", code: "uz" },
  { name: "Vanuatu", code: "vu" }, { name: "Vatican City", code: "va" }, { name: "Venezuela", code: "ve" },
  { name: "Vietnam", code: "vn" }, { name: "Wales", code: "gb-wls" }, { name: "Wallis and Futuna", code: "wf" },
  { name: "Western Sahara", code: "eh" }, { name: "Yemen", code: "ye" }, { name: "Zambia", code: "zm" },
  { name: "Zimbabwe", code: "zw" }
];

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