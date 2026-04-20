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

/**
 * Cria jogadores para times fixos com validação de posição.
 */
const createTeamPlayers = (playerNames: string[], formationKey: FormationKey, teamName: string): Player[] => {
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
        `[VALIDAÇÃO DE ELENCO - ${teamName}]: ` +
        `${basePlayer.name} não possui ${targetPos} nas posições (Principal: ${basePlayer.position}, Secundárias: ${basePlayer.secondaryPositions?.join(', ') || 'Nenhuma'}).`
      );
    }

    return {
      ...basePlayer,
      position: targetPos
    };
  });
};

/**
 * Geração de time 100% aleatório respeitando as posições da formação.
 */
const createRandomTeam = (id: string, name: string, formationKey: FormationKey): OpponentTeam => {
  const formation = FORMATIONS[formationKey];
  const selectedPlayers: Player[] = [];
  const usedIds = new Set<number>();

  formation.positions.forEach((targetPos) => {
    const validOptions = playersData.filter(p =>
      !usedIds.has(p.id) && canPlayerPlayInPosition(p, targetPos)
    );

    if (validOptions.length === 0) {
      console.warn(`Aviso: Poucas opções para a posição ${targetPos}. Usando fallback.`);
      // Fallback básico caso seu banco de dados esteja muito curto para uma posição específica
      const fallback = playersData.find(p => !usedIds.has(p.id)) || playersData[0];
      validOptions.push(fallback);
    }

    const chosenPlayer = validOptions[Math.floor(Math.random() * validOptions.length)];

    selectedPlayers.push({
      ...chosenPlayer,
      position: targetPos
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
    players: createTeamPlayers([
      "Thibaut Courtois", "Nuno Mendes", "William Saliba", "Rúben Dias", "Achraf Hakimi",
      "Rodri", "Pedri", "Federico Valverde",
      "Vini Jr", "Erling Haaland", "Mohamed Salah"
    ], "4-3-3", "Galácticos"),
  },
  {
    id: "team_2",
    name: "Elite Europe",
    formation: "4-4-2",
    players: createTeamPlayers([
      "Alisson", "Alphonso Davies", "Virgil van Dijk", "Antonio Rüdiger", "Dani Carvajal",
      "Rafael Leão", "Declan Rice", "Kevin De Bruyne", "Bukayo Saka",
      "Harry Kane", "Kylian Mbappé"
    ], "4-4-2", "Elite Europe"),
  },
  {
    id: "team_3",
    name: "Super Ballers",
    formation: "3-5-2",
    players: createTeamPlayers([
      "Mike Maignan", "Marquinhos", "Alessandro Bastoni", "Gabriel Magalhães",
      "Federico Dimarco", "Nicolò Barella", "Bruno Fernandes", "Fabián Ruiz", "Denzel Dumfries",
      "Lautaro Martínez", "Ousmane Dembélé"
    ], "3-5-2", "Técnicos"),
  },
  // Time 4 gerado aleatoriamente a cada load
  createRandomTeam("team_4", "All-Stars Random", "4-3-3 (2)")
];