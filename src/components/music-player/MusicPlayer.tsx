import {
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import "./MusicPlayer.css";

interface MusicPlayerProps {
  isMuted: boolean;
  matchFinished?: boolean;
}

const PLAYLIST = [
  { file: "song1.mp3", title: "Jake Daniels - Liar" },
  { file: "song2.mp3", title: "Tokyo Project + Diana Goldberg - Hide 'N Seek" },
  { file: "song3.mp3", title: "In Waves - MONSTERS" },
  { file: "song4.mp3", title: "Unlike Pluto - The In-Between" },
  { file: "song5.mp3", title: "UNDREAM - Nightmare (feat. Neoni)" },
  { file: "song6.mp3", title: "NEFEEX - Mystify" },
  { file: "song7.mp3", title: "Unroyal - BANG" },
];

const MusicPlayer = forwardRef(({ isMuted, matchFinished }: MusicPlayerProps, ref) => {
  const location  = useLocation();
  const isInMatch = location.pathname.toLowerCase() === "/match";
  const shouldPlayCrowd = isInMatch && !matchFinished;
  const [songToast, setSongToast] = useState<{ id: number; title: string } | null>(null);

  const audioRef       = useRef<HTMLAudioElement>(null);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef(0);
  const isInMatchRef   = useRef(isInMatch);
  const initializedRef = useRef(false);

  isInMatchRef.current = isInMatch;

  const hideSongToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    setSongToast(null);
  }, []);

  const showSongToast = useCallback((title: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastIdRef.current += 1;
    setSongToast({ id: toastIdRef.current, title });

    toastTimeoutRef.current = setTimeout(() => {
      setSongToast(null);
      toastTimeoutRef.current = null;
    }, 3200);
  }, []);

  const playRandom = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop   = false;
    audio.volume = 0.10;

    const idx = Math.floor(Math.random() * PLAYLIST.length);
    const track = PLAYLIST[idx];

    audio.src = `/songs/${track.file}`;

    audio.play().then(() => {
      showSongToast(track.title);
    }).catch(() => {});
  }, [showSongToast]);

  const playCrowd = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    hideSongToast();

    audio.loop   = true;
    audio.volume = 0.45;
    audio.src    = "/songs/crowd.mp3";

    audio.play().catch(() => {
      const resume = () => {
        audio.play().catch(() => {});
        document.removeEventListener("click", resume);
      };

      document.addEventListener("click", resume);
    });
  }, [hideSongToast]);

  useImperativeHandle(
    ref,
    () => ({
      skipTrack: () => {
        if (isInMatchRef.current) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        playRandom();
      },
    }),
    [playRandom]
  );

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (shouldPlayCrowd) {
      playCrowd();
    } else {
      const audio = audioRef.current;

      if (audio) {
        audio.loop = false;
        audio.pause();
        audio.src = "";
      }

      const delay = initializedRef.current ? 500 : 2000;

      initializedRef.current = true;

      timeoutRef.current = setTimeout(playRandom, delay);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [shouldPlayCrowd, playCrowd, playRandom]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={() => {
          if (!isInMatchRef.current) playRandom();
        }}
        style={{ display: "none" }}
      />

      {songToast ? (
        <div
          key={songToast.id}
          className="music-toast"
          role="status"
          aria-live="polite"
        >
          <div className="music-toast__head">
            <span className="music-toast__eq" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="music-toast__kicker">Now playing</span>
          </div>
          <strong className="music-toast__title">{songToast.title}</strong>
          <div className="music-toast__progress" aria-hidden="true" />
        </div>
      ) : null}
    </>
  );
});

export default MusicPlayer;
