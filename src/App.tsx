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
  DRAFT_MATCH_RELOAD_PENDING_KEY,
  resetDraftProgress,
} from "./features/draft/draftUtils";

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
