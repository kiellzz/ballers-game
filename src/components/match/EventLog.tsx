import { useState } from "react";
import { getDisplayName } from "../../utils/getDisplayName";
import MatchEventPlayerCard from "./MatchEventPlayerCard";
import type { EventLogEntry } from "./eventLogEntries";
import "./EventLog.css";

export type { EventLogEntry } from "./eventLogEntries";

interface EventLogProps {
  events: EventLogEntry[];
}

export const EventLog = ({ events }: EventLogProps) => {
  const [isEventLogVisible, setIsEventLogVisible] = useState(false);
  const orderedEvents = [...events].reverse();

  return (
    <section className="match-events">
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
        <div className="event-log">
          {orderedEvents.length === 0 ? (
            <p className="event-log__empty">No match events yet.</p>
          ) : (
            orderedEvents.map((event) => {
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
                      <span className="event-log-name" title={event.player.name}>
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

              return (
                <div key={event.id} className="event-log-item">
                  <span className="event-log-minute">[{event.minute}']</span>

                  <div className="event-log-player">
                    <MatchEventPlayerCard
                      player={event.attacker}
                      assignedPosition={event.attackerPosition}
                    />
                    <span className="event-log-name" title={event.attacker.name}>
                      {attackerName}
                    </span>
                  </div>

                  <span className="event-log-vs">VS</span>

                  <div className="event-log-player">
                    <MatchEventPlayerCard
                      player={event.defender}
                      assignedPosition={event.defenderPosition}
                    />
                    <span className="event-log-name" title={event.defender.name}>
                      {defenderName}
                    </span>
                  </div>

                  <span className="event-log-arrow">-&gt;</span>
                  <span className="event-log-action" title={event.action}>
                    {event.action}
                  </span>
                  <span className="event-log-arrow">-&gt;</span>
                  <span className="event-log-outcome" title={event.outcome}>
                    {event.outcome}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  );
};
