// APP.TSX ORIGINAL 

import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Home from "./pages/Home";
import PackOpeningPage from "./pages/PackOpeningPage";
import Lineup from "./pages/Lineup";
import PreMatch from "./pages/PreMatch";
import WelcomePage from "./pages/WelcomePage";
import MusicPlayer from "./components/music-player/MusicPlayer";
import Settings from "./components/settings/Settings";
import { setSoundMuted } from "./utils/sound";
import Match from "./pages/Match";
import DraftLineup from "./pages/DraftLineup";
import DraftPrematch from "./pages/DraftPrematch";
import DraftChampion from "./pages/DraftChampion";
import DraftSummary from "./pages/DraftSummary";
import type { GameMode } from "./pages/WelcomePage";
import {
  createDraftProgress,
  DRAFT_MATCH_RELOAD_PENDING_KEY,
  resetDraftProgress,
  saveDraftProgress,
} from "./features/draft/draftUtils";
import {
  completeDraftCampaign,
  recordDraftMatch,
} from "./features/draft/draftCampaign";

function AppRoutes({
  onMatchFinished,
  onReturnToModeSelect,
  isMuted,
}: {
  onMatchFinished: () => void;
  onReturnToModeSelect: () => void;
  isMuted: boolean;
}) {
  const location = useLocation();
  
  // Reseta matchFinished quando sai da rota /match
  useEffect(() => {
    if (!location.pathname.toLowerCase().includes('/match')) {
      onMatchFinished();
    }
  }, [location.pathname, onMatchFinished]);

  return (
    <Routes>
      <Route path="/" element={<Home onReturnToWelcome={onReturnToModeSelect} />} />
      <Route path="/pack-opening" element={<PackOpeningPage />} />
      <Route path="/lineup" element={<Lineup />} />
      <Route path="/draft-lineup" element={<DraftLineup onReturnToModeSelect={onReturnToModeSelect} />} />
      <Route path="/draft-prematch" element={<DraftPrematch />} />
      <Route
        path="/draft-summary"
        element={
          <DraftSummary
            onContinue={() => {
              resetDraftProgress();
              onReturnToModeSelect();
            }}
          />
        }
      />
      <Route
        path="/draft-champion"
        element={
          <DraftChampion
            onContinue={() => {
              resetDraftProgress();
              onReturnToModeSelect();
            }}
          />
        }
      />
      <Route path="/PreMatch" element={<PreMatch />} />
      <Route
        path="/Match"
        element={
          <Match
            isMuted={isMuted}
            onMatchFinished={() => {}}
            onReturnToModeSelect={onReturnToModeSelect}
          />
        }
      />
    </Routes>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const [hasStarted, setHasStarted] = useState(false);
  const [openModeSelectOnWelcome, setOpenModeSelectOnWelcome] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [matchFinished, setMatchFinished] = useState(false);

  const musicRef = useRef<{ skipTrack: () => void }>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DRAFT_MATCH_RELOAD_PENDING_KEY) !== "1") {
        return;
      }

      sessionStorage.removeItem(DRAFT_MATCH_RELOAD_PENDING_KEY);
      resetDraftProgress();
      setHasStarted(false);
      setOpenModeSelectOnWelcome(false);
      navigate("/", { replace: true });
    } catch {
      // If sessionStorage is blocked, avoid wiping draft progress on an
      // uncertain app mount. Keyboard reload still resets immediately.
    }
  }, [navigate]);

  function handleToggleSound() {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    setSoundMuted(next);
  }

  function handleModeStart(mode: GameMode) {
    setOpenModeSelectOnWelcome(false);
    setHasStarted(true);
    navigate(mode === "draft" ? "/draft-lineup" : "/");
  }

  function handleDraftChampionPreview() {
    let progress = createDraftProgress();
    let campaign = progress.campaign;
    const previewMatches = [
      {
        round: 0 as const,
        score: { user: 3, opponent: 1 },
        performances: [
          { playerId: 1, playerName: "Pele", rating: 8.7, goals: 2, assists: 0 },
          { playerId: 3, playerName: "Lionel Messi", rating: 8.2, goals: 1, assists: 1 },
          { playerId: 4, playerName: "Joshua Kimmich", rating: 7.8, goals: 0, assists: 1 },
        ],
      },
      {
        round: 1 as const,
        score: { user: 2, opponent: 1 },
        performances: [
          { playerId: 1, playerName: "Pele", rating: 8.4, goals: 1, assists: 0 },
          { playerId: 3, playerName: "Lionel Messi", rating: 8.8, goals: 1, assists: 1 },
          { playerId: 4, playerName: "Joshua Kimmich", rating: 7.7, goals: 0, assists: 1 },
        ],
      },
      {
        round: 2 as const,
        score: { user: 2, opponent: 0 },
        performances: [
          { playerId: 1, playerName: "Pele", rating: 9.1, goals: 1, assists: 1 },
          { playerId: 3, playerName: "Lionel Messi", rating: 8.3, goals: 1, assists: 0 },
          { playerId: 4, playerName: "Joshua Kimmich", rating: 8.1, goals: 0, assists: 1 },
        ],
      },
      {
        round: 3 as const,
        score: { user: 3, opponent: 2 },
        performances: [
          { playerId: 1, playerName: "Pele", rating: 9.4, goals: 2, assists: 0 },
          { playerId: 3, playerName: "Lionel Messi", rating: 8.9, goals: 1, assists: 1 },
          { playerId: 4, playerName: "Joshua Kimmich", rating: 8.2, goals: 0, assists: 1 },
        ],
      },
    ];

    for (const match of previewMatches) {
      campaign = recordDraftMatch({
        campaign,
        round: match.round,
        performances: match.performances,
        score: match.score,
      });
    }

    progress = {
      ...progress,
      currentRound: 3,
      campaign: completeDraftCampaign(campaign, { kind: "champion", round: 3 }),
    };

    saveDraftProgress(progress);
    setOpenModeSelectOnWelcome(false);
    setHasStarted(true);
    navigate("/draft-champion");
  }

  function handleReturnToModeSelect() {
    setOpenModeSelectOnWelcome(true);
    setHasStarted(false);
    navigate("/", { replace: true });
  }

  return (
    <>
      {hasStarted && <MusicPlayer ref={musicRef} isMuted={isMuted} matchFinished={matchFinished} />}

      {hasStarted && (
        <Settings
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          onSkip={() => musicRef.current?.skipTrack()}
          isSoundMuted={isSoundMuted}
          onToggleSound={handleToggleSound}
        />
      )}

      {!hasStarted ? (
        <WelcomePage
          onStart={handleModeStart}
          onDraftChampionPreview={handleDraftChampionPreview}
          openModeSelectOnMount={openModeSelectOnWelcome}
        />
      ) : (
        <AppRoutes 
          onMatchFinished={() => setMatchFinished(false)} 
          onReturnToModeSelect={handleReturnToModeSelect}
          isMuted={isMuted} 
        />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
