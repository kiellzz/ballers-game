import type { Player } from "../types/PlayerTypes";
import { FORMATIONS, type FormationKey } from "../utils/formations";
import { playersData } from "../data/PlayersData";
import { canPlayerPlayInPosition } from "../utils/playerValidation";

export interface OpponentTeam {
  id: string;
  name: string;
  formation: FormationKey;
  players: Player[];
  logo?: string;
}

const createTeamPlayers = (
  playerNames: string[],
  formationKey: FormationKey,
  teamName: string
): Player[] => {
  const formation = FORMATIONS[formationKey];
  if (!formation) throw new Error(`Formação ${formationKey} não existe.`);

  return playerNames.map((name, index) => {
    const basePlayer = playersData.find((p) => p.name === name);
    const targetPos = formation.positions[index];

    if (!basePlayer) {
      throw new Error(`[${teamName}] Jogador não encontrado: ${name}`);
    }

    if (!canPlayerPlayInPosition(basePlayer, targetPos)) {
      console.error(
        `[TEAM VALIDATION - ${teamName}]: ` +
          `${basePlayer.name} don't have ${targetPos} in these positions: (Main: ${
            basePlayer.position
          }, Secondary: ${
            basePlayer.secondaryPositions?.join(", ") || "None"
          }).`
      );
    }

    return {
      ...basePlayer,
      position: targetPos,
    };
  });
};

/**
 * Random team generation
 */
const createRandomTeam = (
  id: string,
  name: string,
  formationKey: FormationKey
): OpponentTeam => {
  const formation = FORMATIONS[formationKey];
  const selectedPlayers: Player[] = [];
  const usedIds = new Set<number>();

  formation.positions.forEach((targetPos) => {
    const validOptions = playersData.filter(
      (p) => !usedIds.has(p.id) && canPlayerPlayInPosition(p, targetPos)
    );

    if (validOptions.length === 0) {
      console.warn(
        `Alert: Few options for this position: ${targetPos}. Using fallback.`
      );
      const fallback =
        playersData.find((p) => !usedIds.has(p.id)) || playersData[0];
      validOptions.push(fallback);
    }

    const chosenPlayer =
      validOptions[Math.floor(Math.random() * validOptions.length)];

    selectedPlayers.push({
      ...chosenPlayer,
      position: targetPos,
    });

    usedIds.add(chosenPlayer.id);
  });

  return { id, name, formation: formationKey, players: selectedPlayers };
};

export const MOCK_OPPONENTS: OpponentTeam[] = [
  {
    id: "team_1",
    name: "Galácticos",
    formation: "4-3-3",
    players: createTeamPlayers(
      [
        "Lev Yashin",
        "Nuno Mendes",
        "William Saliba",
        "Rúben Dias",
        "Achraf Hakimi",
        "Rodri",
        "Pedri",
        "Federico Valverde",
        "Vini Jr",
        "Erling Haaland",
        "Mohamed Salah",
      ],
      "4-3-3",
      "Galácticos"
    ),
  },
  {
    id: "team_2",
    name: "Elite Europe",
    formation: "4-4-2",
    players: createTeamPlayers(
      [
        "Alisson",
        "Alphonso Davies",
        "Virgil van Dijk",
        "Antonio Rüdiger",
        "Dani Carvajal",
        "Rafael Leão",
        "Declan Rice",
        "Kevin De Bruyne",
        "Bukayo Saka",
        "Harry Kane",
        "Kylian Mbappé",
      ],
      "4-4-2",
      "Elite Europe"
    ),
  },
  {
    id: "team_3",
    name: "Super Ballers",
    formation: "3-5-2",
    players: createTeamPlayers(
      [
        "Mike Maignan",
        "Marquinhos",
        "Alessandro Bastoni",
        "Gabriel Magalhães",
        "Federico Dimarco",
        "Nicolò Barella",
        "Bruno Fernandes",
        "Fabián Ruiz",
        "Denzel Dumfries",
        "Lautaro Martínez",
        "Ousmane Dembélé",
      ],
      "3-5-2",
      "Técnicos"
    ),
  },
  // Time 4 gerado aleatoriamente a cada load
  createRandomTeam("team_4", "All-Stars Random", "4-3-3 (2)"),
];