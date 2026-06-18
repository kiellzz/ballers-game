import { useCallback, useDeferredValue, useMemo, useState } from "react";
import Header from "../components/home/Header";
import PlayerGrid from "../components/home/PlayerGrid";
import FeatureButton from "../components/feature-button/FeatureButton";
import FilterModal from "../components/filter-modal/FilterModal";
import PlayerCardModal from "../components/player-card/PlayerCardModal";
import ComingSoon from "../components/home/ComingSoon";
import CreatePlayerModal from "../components/home/CreatePlayerModal";
import { playersData } from "../data/PlayersData";
import { getCardTier } from "../utils/getCardTier";
import { defaultFilters } from "../types/FilterTypes";
import { useFavorites } from "../hooks/useFavorite";
import { useCustomPlayers } from "../hooks/useCustomPlayers";
import { useToast } from "../hooks/useToast";
import ToastContainer from "../components/toast/ToastContainer";
import { activeThemeClass } from "../styles/activeTheme";
import type { FilterState } from "../types/FilterTypes";
import type { Player } from "../types/PlayerTypes";
import "./Home.css";

const PAGE_SIZE = 15;
const WORLD_CUP_THEME_CLASS = "theme-world-cup";
const RESERVED_PLAYER_NAMES = playersData.map((player) => player.name);
const normalizedPlayerNames = new WeakMap<Player, string>();

function getNormalizedPlayerName(player: Player): string {
  const cachedName = normalizedPlayerNames.get(player);
  if (cachedName) return cachedName;

  const normalizedName = player.name.toLocaleLowerCase();
  normalizedPlayerNames.set(player, normalizedName);
  return normalizedName;
}

function hasActiveHomeFilters(filters: FilterState, search: string): boolean {
  return (
    search.trim().length > 0 ||
    filters.onlyFavorites ||
    filters.positions.length > 0 ||
    filters.nationalities.length > 0 ||
    filters.tiers.length > 0 ||
    filters.overallMin !== defaultFilters.overallMin ||
    filters.overallMax !== defaultFilters.overallMax ||
    (filters.sortBy ?? defaultFilters.sortBy) !== defaultFilters.sortBy
  );
}

export default function Home() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [isCreatePlayerOpen, setIsCreatePlayerOpen] = useState(false);

  const { favorites, toggleFavorite } = useFavorites();
  const { customPlayers, addCustomPlayer, removeCustomPlayer } = useCustomPlayers();
  const { toasts, addToast, removeToast } = useToast();
  const deferredSearch = useDeferredValue(search);

  // Merge: custom players aparecem primeiro
  const allPlayers = useMemo(() => [...customPlayers, ...playersData], [customPlayers]);
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase();
    const selectedPositions = new Set(filters.positions);
    const selectedNationalities = new Set(filters.nationalities);
    const selectedTiers = new Set(filters.tiers);
    const shouldPrioritizeWorldCupCards =
      activeThemeClass === WORLD_CUP_THEME_CLASS &&
      !hasActiveHomeFilters(filters, deferredSearch);

    const result = allPlayers.filter(player => {
      if (filters.onlyFavorites && !favoriteIds.has(player.id)) {
        return false;
      }

      if (
        normalizedSearch &&
        !getNormalizedPlayerName(player).includes(normalizedSearch)
      ) {
        return false;
      }

      if (selectedPositions.size > 0 && !selectedPositions.has(player.position)) {
        return false;
      }

      if (
        selectedNationalities.size > 0 &&
        !selectedNationalities.has(player.nationality)
      ) {
        return false;
      }

      if (selectedTiers.size > 0) {
        const tier = getCardTier(player.overall, player.isLegend);
        if (!selectedTiers.has(tier)) return false;
      }

      if (player.overall < filters.overallMin || player.overall > filters.overallMax) {
        return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      if (shouldPrioritizeWorldCupCards) {
        const worldCupDelta = Number(Boolean(b.isWCCard)) - Number(Boolean(a.isWCCard));
        if (worldCupDelta !== 0) return worldCupDelta;

        return b.overall - a.overall;
      }

      const order = filters.sortBy ?? "desc";
      return order === "desc" ? b.overall - a.overall : a.overall - b.overall;
    });
  }, [allPlayers, deferredSearch, favoriteIds, filters]);

  const visiblePlayers = useMemo(
    () => filteredPlayers.slice(0, visibleCount),
    [filteredPlayers, visibleCount]
  );
  const hasMore = visibleCount < filteredPlayers.length;
  const hasLess = visibleCount > PAGE_SIZE;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setFilters(defaultFilters);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleShowMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredPlayers.length));
  }, [filteredPlayers.length]);

  const handleShowLess = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleRemovePlayer = useCallback(() => {
    if (selectedPlayer && customPlayers.some(p => p.id === selectedPlayer.id)) {
      const name = selectedPlayer.name;
      removeCustomPlayer(selectedPlayer.id);
      addToast(name, "__deleted__", "success");
    }
    setSelectedPlayer(null);
  }, [addToast, customPlayers, removeCustomPlayer, selectedPlayer]);

  const handleCardClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
  }, []);

  const handleClosePlayer = useCallback(() => setSelectedPlayer(null), []);
  const handleOpenFilters = useCallback(() => setIsFilterModalOpen(true), []);
  const handleCloseFilters = useCallback(() => setIsFilterModalOpen(false), []);
  const handleOpenCreatePlayer = useCallback(() => setIsCreatePlayerOpen(true), []);
  const handleCloseCreatePlayer = useCallback(() => setIsCreatePlayerOpen(false), []);
  const handleOpenComingSoon = useCallback(() => setIsComingSoonOpen(true), []);
  const handleCloseComingSoon = useCallback(() => setIsComingSoonOpen(false), []);

  const handleSaveCustomPlayer = useCallback(
    (player: Player) => {
      addCustomPlayer(player);
      addToast(player.name, "__created__", "success");
    },
    [addCustomPlayer, addToast]
  );

  const handleToggleSelectedFavorite = useCallback(() => {
    if (selectedPlayer) toggleFavorite(selectedPlayer.id);
  }, [selectedPlayer, toggleFavorite]);

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
            onOpenFilters={handleOpenFilters}
            onClearFilters={handleClearFilters}
            onCreatePlayer={handleOpenCreatePlayer}
          />

          {filteredPlayers.length === 0 ? (
            <p className="home__empty">No players found.</p>
          ) : (
            <PlayerGrid
              players={visiblePlayers}
              favoriteIds={favoriteIds}
              onCardClick={handleCardClick}
            />
          )}

          <div className="home__actions">
            {hasMore && (
              <FeatureButton label="SHOW MORE PLAYERS" onClick={handleShowMore} />
            )}
            {hasLess && (
              <FeatureButton
                label="SHOW LESS PLAYERS"
                onClick={handleShowLess}
                variant="less"
              />
            )}
            <FeatureButton
              label="DRAFT MODE"
              onClick={handleOpenComingSoon}
            />
          </div>
        </div>
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilters}
        filters={filters}
        onChange={handleFiltersChange}
      />

      {selectedPlayer && (
        <PlayerCardModal
          player={selectedPlayer}
          isFavorite={favoriteIds.has(selectedPlayer.id)}
          onClose={handleClosePlayer}
          onRemove={handleRemovePlayer}
          onToggleFavorite={handleToggleSelectedFavorite}
        />
      )}

      {isComingSoonOpen && (
        <ComingSoon onClose={handleCloseComingSoon} />
      )}

      {isCreatePlayerOpen && (
        <CreatePlayerModal
          onClose={handleCloseCreatePlayer}
          onSave={handleSaveCustomPlayer}
          reservedNames={RESERVED_PLAYER_NAMES}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
