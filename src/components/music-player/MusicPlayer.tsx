import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

interface MusicPlayerProps {
  isMuted: boolean;
}

const MusicPlayer = forwardRef(({ isMuted }: MusicPlayerProps, ref) => {
  const playlist = [
    "song1.mp3",
    "song2.mp3",
    "song3.mp3",
    "song4.mp3",
    "song5.mp3",
    "song6.mp3",
    "song7.mp3"
  ];

  const audioRef = useRef<HTMLAudioElement>(null);
  // Ref para controlar o timer e evitar memory leaks se o componente for desmontado rápido
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playRandom = () => {
    if (audioRef.current) {
      audioRef.current.volume = 0.10;
      const randomIndex = Math.floor(Math.random() * playlist.length);
      audioRef.current.src = `/songs/${playlist[randomIndex]}`;
      audioRef.current.play().catch((err) =>
        console.log("Erro ao reproduzir:", err)
      );
    }
  };

  useImperativeHandle(ref, () => ({
    skipTrack: () => {
      // Se o usuário pular manualmente, limpamos o delay e tocamos na hora
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      playRandom();
    }
  }));

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    // Adicionando o delay de 2 segundos (2000ms)
    timeoutRef.current = setTimeout(() => {
      playRandom();
    }, 2000);

    // Cleanup para limpar o timer caso o componente saia da tela inesperadamente
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      onEnded={playRandom}
      style={{ display: "none" }}
    />
  );
});

export default MusicPlayer;