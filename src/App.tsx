// APP.TSX ORIGINAL 

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

function AppRoutes({ onMatchFinished, isMuted }: { onMatchFinished: () => void; isMuted: boolean }) {
  const location = useLocation();
  
  // Reseta matchFinished quando sai da rota /match
  useEffect(() => {
    if (!location.pathname.toLowerCase().includes('/match')) {
      onMatchFinished();
    }
  }, [location.pathname, onMatchFinished]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pack-opening" element={<PackOpeningPage />} />
      <Route path="/lineup" element={<Lineup />} />
      <Route path="/PreMatch" element={<PreMatch />} />
      <Route path="/Match" element={<Match isMuted={isMuted} onMatchFinished={() => {}} />} />
    </Routes>
  );
}

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [matchFinished, setMatchFinished] = useState(false);

  const musicRef = useRef<{ skipTrack: () => void }>(null);

  function handleToggleSound() {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    setSoundMuted(next);
  }

  return (
    <BrowserRouter>
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
        <WelcomePage onStart={() => setHasStarted(true)} />
      ) : (
        <AppRoutes 
          onMatchFinished={() => setMatchFinished(false)} 
          isMuted={isMuted} 
        />
      )}
    </BrowserRouter>
  );
}

export default App;
