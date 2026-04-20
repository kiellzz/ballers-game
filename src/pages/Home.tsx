import { useState, useMemo } from "react";
import Header from "../components/home/Header";
import PlayerGrid from "../components/home/PlayerGrid";
import FeatureButton from "../components/feature-button/FeatureButton";
import FilterModal from "../components/filter-modal/FilterModal";
import PlayerCardModal from "../components/player-card/PlayerCardModal";
import { playersData } from "../data/PlayersData";
import { getCardTier } from "../utils/getCardTier";
import { defaultFilters } from "../types/FilterTypes";
import { useFavorites } from "../hooks/useFavorite";
import type { FilterState } from "../types/FilterTypes";
import type { Player } from "../types/PlayerTypes";
import "./Home.css";

const PAGE_SIZE = 15;

export default function Home() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const { favorites, toggleFavorite } = useFavorites();

  const filteredPlayers = useMemo(() => {
    const result = playersData.filter(player => {
      if (filters.onlyFavorites && !favorites.includes(player.id)) {
        return false;
      }

      if (search) {
        const q = search.toLowerCase();
        if (!player.name.toLowerCase().includes(q)) return false;
      }

      if (filters.positions.length > 0 && !filters.positions.includes(player.position)) {
        return false;
      }

      if (filters.nationalities.length > 0 && !filters.nationalities.includes(player.nationality)) {
        return false;
      }

      if (filters.tiers.length > 0) {
        const tier = getCardTier(player.overall, player.isLegend);
        if (!filters.tiers.includes(tier)) return false;
      }

      if (player.overall < filters.overallMin || player.overall > filters.overallMax) {
        return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      const order = filters.sortBy ?? 'desc';
      return order === 'desc'
        ? b.overall - a.overall
        : a.overall - b.overall;
    });
  }, [search, filters, favorites]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPlayers.length;
  const hasLess = visibleCount > PAGE_SIZE;

  function handleSearchChange(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleFiltersChange(newFilters: FilterState) {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE);
  }

  function handleClearFilters() {
    setSearch("");
    setFilters(defaultFilters);
    setVisibleCount(PAGE_SIZE);
  }

  function handleShowMore() {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredPlayers.length));
  }

  function handleShowLess() {
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  }

  return (
    <div className="home">
      <div className="home__overlay" />

      <div className="home__container">
        <img
          src="/images/headerart.png"
          alt=""
          className="home__frame"
          aria-hidden="true"
        />

        <div className="home__content">
          <Header
            search={search}
            filters={filters}
            onSearchChange={handleSearchChange}
            onOpenFilters={() => setIsFilterModalOpen(true)}
            onClearFilters={handleClearFilters}
          />

          {filteredPlayers.length === 0 ? (
            <p className="home__empty">No players found.</p>
          ) : (
            <PlayerGrid
              players={visiblePlayers}
              favorites={favorites}
              onCardClick={(player) => setSelectedPlayer(player)}
            />
          )}

          <div className="home__actions">
            {hasMore && (
              <FeatureButton label="SHOW MORE PLAYERS" onClick={handleShowMore} />
            )}
            {hasLess && (
              <FeatureButton label="SHOW LESS PLAYERS" onClick={handleShowLess} variant="less" />
            )}
            <FeatureButton label="DRAFT MODE" />
          </div>
        </div>
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onChange={handleFiltersChange}
      />

      {selectedPlayer && (
        <PlayerCardModal
          player={selectedPlayer}
          isFavorite={favorites.includes(selectedPlayer.id)}
          onClose={() => setSelectedPlayer(null)}
          onRemove={() => setSelectedPlayer(null)}
          onToggleFavorite={() => toggleFavorite(selectedPlayer.id)}
        />
      )}
    </div>
  );
}