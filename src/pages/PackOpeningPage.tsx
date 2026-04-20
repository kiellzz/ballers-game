import { PackOpening } from "../components/pack-opening/PackOpening";
import { playersData } from "../data/PlayersData";

export default function PackOpeningPage() {
  return <PackOpening players={playersData} />;
}