import { useState, useMemo } from 'react';
import { List } from 'lucide-react';
import type { Player, Position } from '../../types/PlayerTypes';
import type { FilterState } from '../../types/FilterTypes';
import { playersData } from '../../data/PlayersData';
import { canPlayerPlayInPosition } from '../../utils/playerValidation';
import { getCardTier } from '../../utils/getCardTier';
import { useFavorites } from '../../hooks/useFavorite';
import { playSelect } from '../../utils/sound';
import LineupCard from './LineupCard';
import FilterModal from '../filter-modal/FilterModal';
import './PlayerSearchModal.css';

interface Props {
  slotPosition: Position;
  onSelect: (player: Player) => void;
  onClose: () => void;
  excludePlayerIds: number[];
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  /** Se true, ignora validação de posição (usado para slots do banco) */
  freePosition?: boolean;
}

export default function PlayerSearchModal({
  slotPosition,
  onSelect,
  onClose,
  excludePlayerIds,
  filters,
  setFilters,
  freePosition = false,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { favorites } = useFavorites();

  // Atualizado para incluir a checagem de positions.length
  const hasActiveFilters =
    filters.overallMin > 1 ||
    filters.overallMax < 99 ||
    filters.tiers.length > 0 ||
    filters.positions.length > 0 ||
    filters.nationalities.length > 0 ||
    filters.onlyFavorites;

  const filteredPlayers = useMemo(() => {
    const result = playersData.filter(player => {
      // 1. Validação de Slot (Regra de Negócio do Campo)
      // Se não for banco, o jogador deve ser capaz de jogar naquela posição específica
      if (!freePosition && !canPlayerPlayInPosition(player, slotPosition)) return false;

      // 2. Filtro de Posições (Vindo do FilterModal)
      // Se o usuário selecionou posições manualmente, filtramos por elas
      if (filters.positions.length > 0) {
        if (!filters.positions.includes(player.position)) return false;
      }

      // 3. Filtros Gerais
      if (excludePlayerIds.includes(player.id)) return false;
      if (filters.onlyFavorites && !favorites.includes(player.id)) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!player.name.toLowerCase().includes(q)) return false;
      }

      if (player.overall < filters.overallMin || player.overall > filters.overallMax) return false;

      if (filters.nationalities.length > 0 && !filters.nationalities.includes(player.nationality)) {
        return false;
      }

      if (filters.tiers.length > 0) {
        const playerTier = getCardTier(player.overall, player.isLegend);
        if (!filters.tiers.includes(playerTier)) return false;
      }

      return true;
    });

    // 4. Ordenação (Higher/Lower Overall)
    return result.sort((a, b) => {
      const order = filters.sortBy ?? 'desc';
      return order === 'desc' ? b.overall - a.overall : a.overall - b.overall;
    });
  }, [searchTerm, slotPosition, freePosition, excludePlayerIds, filters, favorites]);

  const toggleGlobalFavoriteFilter = () => {
    setFilters({ ...filters, onlyFavorites: !filters.onlyFavorites });
  };

  const handleSelect = (player: Player) => {
    playSelect(0.4);
    onSelect(player);
  };

  return (
    <div className="search-modal-overlay">
      <div className="search-modal">
        <header className="search-modal__header">
          <h3>{freePosition ? 'Select a substitute' : `Select your ${slotPosition}`}</h3>

          <div className="search-modal__header-actions">
            <button
              className={`search-modal__fav-btn ${filters.onlyFavorites ? 'active' : ''}`}
              onClick={toggleGlobalFavoriteFilter}
              type="button"
              title="Filter by favorites"
            >
              ★
            </button>

            <button
              className={`header__icon-btn ${hasActiveFilters ? 'header__icon-btn--active' : ''}`}
              onClick={() => setIsFilterOpen(true)}
              type="button"
              aria-label="Open advanced filters"
            >
              <List size={20} strokeWidth={2.4} />
              {hasActiveFilters && <span className="header__filter-dot" />}
            </button>

            <button className="search-modal__close" onClick={onClose} aria-label="Close modal">
              X
            </button>
          </div>
        </header>

        <input
          type="text"
          placeholder="Search a player..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-modal__input"
        />

        <div className="search-modal__grid">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map(player => (
              <div
                key={player.id}
                onClick={() => handleSelect(player)}
                className="search-modal__item"
              >
                <LineupCard
                  player={player}
                  isFavorite={favorites.includes(player.id)}
                />
              </div>
            ))
          ) : (
            <p className="search-modal__empty">No players found.</p>
          )}
        </div>

        <FilterModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          onChange={setFilters}
        />
      </div>
    </div>
  );
}