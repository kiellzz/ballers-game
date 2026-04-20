import { useState } from "react";
import type { Player } from "../../types/PlayerTypes";
import { getDisplayName } from "../../utils/getDisplayName";
import MatchEventPlayerCard from "./MatchEventPlayerCard";
import "./EventLog.css";

export interface EventLogEntry {
  id: string;
  minute: number;
  attacker: Player;
  defender: Player;
  attackerPosition?: string;
  defenderPosition?: string;
  action: string;
  outcome: string;
}

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
            <p className="event-log__empty">No duel events yet.</p>
          ) : (
            orderedEvents.map((event) => {
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
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
