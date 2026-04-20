import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useRef } from "react";
import Home from "./pages/Home";
import PackOpeningPage from "./pages/PackOpeningPage";
import Lineup from "./pages/Lineup";
import PreMatch from "./pages/PreMatch";
import WelcomePage from "./pages/WelcomePage";
import MusicPlayer from "./components/music-player/MusicPlayer";
import Settings from "./components/settings/Settings";
import { setSoundMuted } from "./utils/sound";
import Match from "./pages/Match";

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  const musicRef = useRef<{ skipTrack: () => void }>(null);

  function handleToggleSound() {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    setSoundMuted(next);
  }

  return (
    <BrowserRouter>
      {hasStarted && <MusicPlayer ref={musicRef} isMuted={isMuted} />}

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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pack-opening" element={<PackOpeningPage />} />
          <Route path="/lineup" element={<Lineup />} />
          <Route path="/PreMatch" element={<PreMatch />} />
          <Route path="/Match" element={<Match />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
