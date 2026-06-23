import {
  getPenaltyShootoutAttempts,
  getPenaltyShootoutScore,
  type PenaltyShootoutState,
} from "../penaltyShootout";

interface PenaltyShootoutScoreboardProps {
  state: PenaltyShootoutState;
}

export default function PenaltyShootoutScoreboard({
  state,
}: PenaltyShootoutScoreboardProps) {
  const userAttempts = getPenaltyShootoutAttempts(state, "user");
  const opponentAttempts = getPenaltyShootoutAttempts(state, "opponent");
  const score = getPenaltyShootoutScore(state);
  const slotCount = Math.max(5, userAttempts.length, opponentAttempts.length);

  function renderAttempts(
    attempts: ReturnType<typeof getPenaltyShootoutAttempts>,
    side: "user" | "opponent"
  ) {
    return Array.from({ length: slotCount }, (_, index) => {
      const attempt = attempts[index];
      const isCurrent =
        !attempt &&
        !state.winner &&
        state.currentSide === side &&
        index === attempts.length;

      return (
        <span
          key={`${side}-${index}`}
          className={`pen-shootout-dot${
            attempt
              ? attempt.scored
                ? " is-goal"
                : " is-miss"
              : isCurrent
                ? " is-current"
                : ""
          }`}
          aria-label={
            attempt
              ? attempt.scored
                ? "Goal"
                : "Miss"
              : isCurrent
                ? "Current kick"
                : "Pending kick"
          }
        />
      );
    });
  }

  return (
    <div className="pen-shootout-score" aria-label="Penalty shootout score">
      <span className="pen-shootout-score__title">Penalty shootout</span>

      <div className="pen-shootout-score__row">
        <span className="pen-shootout-score__team">Your team</span>
        <div className="pen-shootout-score__dots">
          {renderAttempts(userAttempts, "user")}
        </div>
        <strong>{score.user}</strong>
      </div>

      <div className="pen-shootout-score__row">
        <span className="pen-shootout-score__team">Opponent</span>
        <div className="pen-shootout-score__dots">
          {renderAttempts(opponentAttempts, "opponent")}
        </div>
        <strong>{score.opponent}</strong>
      </div>
    </div>
  );
}
