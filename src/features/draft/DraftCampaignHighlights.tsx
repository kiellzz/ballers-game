import { Award, Crosshair, Goal } from "lucide-react";
import type { ReactNode } from "react";
import { playersData } from "../../data/PlayersData";
import { getPlayerImage } from "../../utils/getPlayerImage";
import {
  getDraftCampaignLeaders,
  type DraftCampaignLeader,
  type DraftCampaignState,
} from "./draftCampaign";
import "./DraftCampaignHighlights.css";

interface DraftCampaignHighlightsProps {
  campaign: DraftCampaignState;
}

const playerById = new Map(playersData.map((player) => [player.id, player]));

export default function DraftCampaignHighlights({
  campaign,
}: DraftCampaignHighlightsProps) {
  const leaders = getDraftCampaignLeaders(campaign);

  return (
    <section className="draft-highlights" aria-label="Draft campaign highlights">
      <HighlightGroup
        label="Draft MVP"
        icon={<Award aria-hidden="true" />}
        leaders={leaders.mvp}
        formatValue={(value) => `${value.toFixed(1)} AVG`}
        tone="mvp"
      />
      <HighlightGroup
        label="Top scorer"
        icon={<Goal aria-hidden="true" />}
        leaders={leaders.topScorers}
        formatValue={(value) => `${value} ${value === 1 ? "GOAL" : "GOALS"}`}
        tone="goals"
      />
      <HighlightGroup
        label="Top assister"
        icon={<Crosshair aria-hidden="true" />}
        leaders={leaders.topAssisters}
        formatValue={(value) => `${value} ${value === 1 ? "ASSIST" : "ASSISTS"}`}
        tone="assists"
      />
    </section>
  );
}

function HighlightGroup({
  label,
  icon,
  leaders,
  formatValue,
  tone,
}: {
  label: string;
  icon: ReactNode;
  leaders: DraftCampaignLeader[];
  formatValue: (value: number) => string;
  tone: "mvp" | "goals" | "assists";
}) {
  return (
    <article className={`draft-highlight draft-highlight--${tone}`}>
      <header className="draft-highlight__header">
        <span className="draft-highlight__icon">{icon}</span>
        <h2>{label}</h2>
      </header>

      <div className="draft-highlight__leaders">
        {leaders.length === 0 ? (
          <p className="draft-highlight__none">None</p>
        ) : (
          leaders.map((leader) => {
            const player = playerById.get(leader.playerId);
            const playerName = player?.name ?? leader.playerName;

            return (
              <div className="draft-highlight__leader" key={leader.playerId}>
                <img
                  src={player?.customImage ?? getPlayerImage(playerName)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src = "/images/players/default.webp";
                  }}
                />
                <div>
                  <strong>{playerName}</strong>
                  <span>{formatValue(leader.value)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
