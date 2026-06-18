import { memo, useMemo, useState } from "react";
import { getDisplayName } from "../../utils/getDisplayName";
import MatchEventPlayerCard from "./MatchEventPlayerCard";
import type { EventLogEntry } from "../../match-engine/ui_ux/eventLogEntries";
import "./EventLog.css";

export type { EventLogEntry } from "../../match-engine/ui_ux/eventLogEntries";

interface EventLogProps {
  events: EventLogEntry[];
}

export const EventLog = memo(function EventLog({ events }: EventLogProps) {
  const [isEventLogVisible, setIsEventLogVisible] = useState(false);
  const orderedEvents = useMemo(() => {
    if (!isEventLogVisible) {
      return [];
    }

    return events
      .map((event, index) => ({ event, index }))
      .sort((left, right) => {
        if (right.event.minute !== left.event.minute) {
          return right.event.minute - left.event.minute;
        }

        return right.index - left.index;
      })
      .map(({ event }) => event);
  }, [events, isEventLogVisible]);

  function isGoalEvent(event: EventLogEntry): boolean {
    return event.kind === "duel" && event.outcome === "Goal";
  }

  function getPlayerNameClass(side: "user" | "opponent"): string {
    return `event-log-name${
      side === "opponent" ? " event-log-name--opponent" : ""
    }`;
  }

  return (
    <section
      className={`match-events${
        isEventLogVisible ? " match-events--open" : ""
      }`}
    >
      <div className="match-events__header">
        <h3>Match events</h3>
        <button
          type="button"
          className="match-events__toggle"
          aria-expanded={isEventLogVisible}
          onClick={() => setIsEventLogVisible((current) => !current)}
        >
          {isEventLogVisible ? "Hide" : "Show"}
        </button>
      </div>

      <div
        className={`event-log-body ${
          isEventLogVisible ? "event-log-body--visible" : ""
        }`}
        aria-hidden={!isEventLogVisible}
      >
        {isEventLogVisible ? <div className="event-log">
          {orderedEvents.length === 0 ? (
            <p className="event-log__empty">No match events yet.</p>
          ) : (
            orderedEvents.map((event) => {
              if (event.kind === "substitution") {
                const outPlayerName = getDisplayName(event.outPlayer);
                const inPlayerName = getDisplayName(event.inPlayer);

                return (
                  <div
                    key={event.id}
                    className="event-log-item event-log-item--substitution"
                  >
                    <span className="event-log-minute">[{event.minute}']</span>

                    <div className="event-log-player">
                      <MatchEventPlayerCard
                        player={event.outPlayer}
                        assignedPosition={event.outPlayerPosition}
                      />
                      <span
                        className={getPlayerNameClass(event.side)}
                        title={event.outPlayer.name}
                      >
                        {outPlayerName}
                      </span>
                    </div>

                    <span className="event-log-arrow">-&gt;</span>

                    <div className="event-log-player">
                      <MatchEventPlayerCard
                        player={event.inPlayer}
                        assignedPosition={event.inPlayerPosition}
                      />
                      <span
                        className={getPlayerNameClass(event.side)}
                        title={event.inPlayer.name}
                      >
                        {inPlayerName}
                      </span>
                    </div>

                    <span className="event-log-arrow">-&gt;</span>
                    <span
                      className="event-log-outcome event-log-outcome--substitution"
                      title={event.outcome}
                    >
                      {event.outcome}
                    </span>
                  </div>
                );
              }

              if (event.kind === "card") {
                const playerName = getDisplayName(event.player);

                return (
                  <div
                    key={event.id}
                    className={`event-log-item event-log-item--card event-log-item--card-${event.cardType}`}
                  >
                    <span className="event-log-minute">[{event.minute}']</span>

                    <div className="event-log-player">
                      <MatchEventPlayerCard
                        player={event.player}
                        assignedPosition={event.playerPosition}
                      />
                      <span
                        className={getPlayerNameClass(event.playerSide)}
                        title={event.player.name}
                      >
                        {playerName}
                      </span>
                    </div>

                    <span
                      className={`event-log-card-swatch event-log-card-swatch--${event.cardType}`}
                      aria-hidden="true"
                    />

                    <span className="event-log-arrow">-&gt;</span>
                    <span className="event-log-action" title={event.action}>
                      {event.action}
                    </span>
                    <span className="event-log-arrow">-&gt;</span>
                    <span
                      className={`event-log-outcome event-log-outcome--${event.cardType}`}
                      title={event.outcome}
                    >
                      {event.outcome}
                    </span>
                  </div>
                );
              }

              const attackerName = getDisplayName(event.attacker);
              const defenderName = getDisplayName(event.defender);
              const goalEvent = isGoalEvent(event);

              return (
                <div
                  key={event.id}
                  className={`event-log-item event-log-item--duel${
                    goalEvent ? " event-log-item--goal" : ""
                  }`}
                >
                  <span className="event-log-minute">[{event.minute}']</span>

                  <div className="event-log-player">
                    <MatchEventPlayerCard
                      player={event.attacker}
                      assignedPosition={event.attackerPosition}
                    />
                    <span
                      className={getPlayerNameClass(event.attackerSide)}
                      title={event.attacker.name}
                    >
                      {attackerName}
                    </span>
                  </div>

                  <span className="event-log-vs">VS</span>

                  <div className="event-log-player">
                    <MatchEventPlayerCard
                      player={event.defender}
                      assignedPosition={event.defenderPosition}
                    />
                    <span
                      className={getPlayerNameClass(event.defenderSide)}
                      title={event.defender.name}
                    >
                      {defenderName}
                    </span>
                  </div>

                  <span className="event-log-arrow">-&gt;</span>
                  <span className="event-log-action" title={event.action}>
                    {event.action}
                  </span>
                  <span className="event-log-arrow">-&gt;</span>
                  <span
                    className={`event-log-outcome${
                      goalEvent ? " event-log-outcome--goal" : ""
                    }`}
                    title={event.outcome}
                  >
                    {event.outcome}
                  </span>
                </div>
              )
            })
          )}
        </div> : null}
      </div>
    </section>
  );
});
