import { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useLocation } from "react-router-dom";

interface MusicPlayerProps {
  isMuted: boolean;
  matchFinished?: boolean;
}

const PLAYLIST = [
  "song1.mp3",
  "song2.mp3",
  "song3.mp3",
  "song4.mp3",
  "song5.mp3",
  "song6.mp3",
  "song7.mp3",
];

const MusicPlayer = forwardRef(({ isMuted, matchFinished }: MusicPlayerProps, ref) => {
  const location  = useLocation();
  const isInMatch = location.pathname.toLowerCase() === "/match";
  const shouldPlayCrowd = isInMatch && !matchFinished;

  const audioRef       = useRef<HTMLAudioElement>(null);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInMatchRef   = useRef(isInMatch);
  const initializedRef = useRef(false);

  isInMatchRef.current = isInMatch;

  const playRandom = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop   = false;
    audio.volume = 0.10;

    const idx = Math.floor(Math.random() * PLAYLIST.length);

    audio.src = `/songs/${PLAYLIST[idx]}`;

    audio.play().catch(() => {});
  }, []);

  const playCrowd = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

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
  }, []);

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

  return (
    <audio
      ref={audioRef}
      onEnded={() => {
        if (!isInMatchRef.current) playRandom();
      }}
      style={{ display: "none" }}
    />
  );
});

export default MusicPlayer;