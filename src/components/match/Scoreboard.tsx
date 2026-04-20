import React, { useEffect, useRef } from 'react';
import './Scoreboard.css';

interface ScoreboardProps {
  homeScore: number | string;
  awayScore: number | string;
  gameTime: string;
}

type ScoredSide = 'home' | 'away' | null;

const SCORE_FLASH_DURATION_MS = 1050;

function toNumericScore(value: number | string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  homeScore,
  awayScore,
  gameTime,
}) => {
  const previousScoresRef = useRef({
    home: toNumericScore(homeScore),
    away: toNumericScore(awayScore),
  });

  const clearAnimationTimeoutRef = useRef<number | null>(null);
  const homeTeamRef = useRef<HTMLDivElement | null>(null);
  const awayTeamRef = useRef<HTMLDivElement | null>(null);
  const homeScoreRef = useRef<HTMLSpanElement | null>(null);
  const awayScoreRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const previousScores = previousScoresRef.current;
    const nextScores = {
      home: toNumericScore(homeScore),
      away: toNumericScore(awayScore),
    };

    let scoredSide: ScoredSide = null;

    if (
      nextScores.home !== null &&
      previousScores.home !== null &&
      nextScores.home > previousScores.home
    ) {
      scoredSide = 'home';
    } else if (
      nextScores.away !== null &&
      previousScores.away !== null &&
      nextScores.away > previousScores.away
    ) {
      scoredSide = 'away';
    }

    previousScoresRef.current = nextScores;

    if (!scoredSide) {
      return;
    }

    const homeTeam = homeTeamRef.current;
    const awayTeam = awayTeamRef.current;
    const homeScoreElement = homeScoreRef.current;
    const awayScoreElement = awayScoreRef.current;

    homeTeam?.classList.remove('score-team--scored');
    awayTeam?.classList.remove('score-team--scored');
    homeScoreElement?.classList.remove('score-number--updated');
    awayScoreElement?.classList.remove('score-number--updated');

    const teamElement = scoredSide === 'home' ? homeTeam : awayTeam;
    const scoreElement =
      scoredSide === 'home' ? homeScoreElement : awayScoreElement;

    if (teamElement && scoreElement) {
      void teamElement.offsetWidth;
      teamElement.classList.add('score-team--scored');
      scoreElement.classList.add('score-number--updated');
    }

    if (clearAnimationTimeoutRef.current !== null) {
      window.clearTimeout(clearAnimationTimeoutRef.current);
    }

    clearAnimationTimeoutRef.current = window.setTimeout(() => {
      homeTeam?.classList.remove('score-team--scored');
      awayTeam?.classList.remove('score-team--scored');
      homeScoreElement?.classList.remove('score-number--updated');
      awayScoreElement?.classList.remove('score-number--updated');
      clearAnimationTimeoutRef.current = null;
    }, SCORE_FLASH_DURATION_MS);
  }, [awayScore, homeScore]);

  useEffect(() => {
    return () => {
      if (clearAnimationTimeoutRef.current !== null) {
        window.clearTimeout(clearAnimationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header className="match-scoreboard">
      <div ref={homeTeamRef} className="score-team score-team--home">
        <span className="score-label">HOME TEAM</span>
        <span ref={homeScoreRef} className="score-number">
          {homeScore}
        </span>
      </div>

      <span className="score-divider" aria-hidden="true" />

      <div className="match-time">
        <span className="time-label">GAME TIME</span>
        <span className="time-number">{gameTime}</span>
      </div>

      <span className="score-divider" aria-hidden="true" />

      <div ref={awayTeamRef} className="score-team score-team--away">
        <span className="score-label">AWAY TEAM</span>
        <span ref={awayScoreRef} className="score-number">
          {awayScore}
        </span>
      </div>
    </header>
  );
};
