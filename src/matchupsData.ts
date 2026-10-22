// matchupsData.ts
// Tipagem + dados do LoL Matchup Encyclopedia.
// Fonte única das matchups: matchups.json (mesma pasta).
// Edições feitas no app ficam no LocalStorage até você publicá-las
// (botão de download no topo do app) e substituir o matchups.json.
import raw from "./matchups.json";

export type MatchupStatus = "favoravel" | "skill" | "desfavoravel";

export interface Champion {
  id: string; // ID do Data Dragon (usado na URL do ícone)
  name: string; // Nome de exibição
  tier: "main" | "pool" | "other";
}

export interface Matchup {
  champion: string; // id do meu campeão
  enemy: string; // id do inimigo
  status: MatchupStatus;
  goldenRule: string;
  laning: {
    early: string; // Nível 1-2
    mid: string; // Nível 3-5
    late: string; // Nível 6+
  };
  setup: {
    runes: string[];
    items: string[];
  };
  summary: string;
}

// Versão do Data Dragon usada nos ícones. Atualize quando quiser.
export const DDRAGON_VERSION = "15.20.1";
export const championIcon = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${id}.png`;

export const STATUS_LABEL: Record<MatchupStatus, string> = {
  favoravel: "Matchup Favorável",
  skill: "Skill Matchup",
  desfavoravel: "Desfavorável",
};

// ---------------------------------------------------------------------------
// CHAMPION POOL
// ---------------------------------------------------------------------------
const MAIN = ["Mordekaiser", "Garen", "Teemo", "Fiora", "Renekton"];
const POOL = ["Nasus", "Riven", "Malphite", "Tryndamere", "Jinx", "KogMaw"];

function toDDragonId(name: string): string {
  const special: Record<string, string> = {
    "Cho'Gath": "Chogath",
    "Dr. Mundo": "DrMundo",
    "K'Sante": "KSante",
    "Kog'Maw": "KogMaw",
    Wukong: "MonkeyKing",
  };
  return special[name] ?? name.replace(/[^A-Za-z]/g, "");
}

const mk = (id: string, name: string, tier: Champion["tier"]): Champion => ({
  id,
  name,
  tier,
});

const OTHER_TOPS = [
  "Aatrox", "Camille", "Cho'Gath", "Darius", "Dr. Mundo", "Gangplank",
  "Gnar", "Gragas", "Gwen", "Illaoi", "Irelia", "Jax", "Jayce", "K'Sante",
  "Kayle", "Kennen", "Kled", "Olaf", "Ornn", "Pantheon",
  "Poppy", "Quinn", "Rumble", "Sett", "Shen", "Singed", "Sion", "Trundle",
  "Urgot", "Vayne", "Vladimir", "Volibear", "Warwick", "Wukong", "Yasuo",
  "Yone", "Yorick",
];

export const CHAMPIONS: Champion[] = [
  ...MAIN.map((n) => mk(toDDragonId(n), n, "main")),
  ...POOL.map((n) => mk(toDDragonId(n), n === "KogMaw" ? "Kog'Maw" : n, "pool")),
  ...OTHER_TOPS.map((n) => mk(toDDragonId(n), n, "other")),
].sort((a, b) => a.name.localeCompare(b.name));

export const getChampion = (id: string) => CHAMPIONS.find((c) => c.id === id);

// ---------------------------------------------------------------------------
// MATCHUPS
// ---------------------------------------------------------------------------
export const matchupKey = (champion: string, enemy: string) =>
  `${champion}|${enemy}`;

export const MATCHUPS: Matchup[] = raw as unknown as Matchup[];

const INDEX = new Map<string, Matchup>(
  MATCHUPS.map((m) => [matchupKey(m.champion, m.enemy), m])
);

export const baseMatchup = (champion: string, enemy: string) =>
  INDEX.get(matchupKey(champion, enemy));

// Comparação campo a campo (independe da ordem das chaves).
const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const sameMatchup = (a: Matchup, b: Matchup) =>
  a.champion === b.champion &&
  a.enemy === b.enemy &&
  a.status === b.status &&
  a.goldenRule === b.goldenRule &&
  a.summary === b.summary &&
  a.laning.early === b.laning.early &&
  a.laning.mid === b.laning.mid &&
  a.laning.late === b.laning.late &&
  sameList(a.setup.runes, b.setup.runes) &&
  sameList(a.setup.items, b.setup.items);

// Pool padrão (editável no app)
export const DEFAULT_POOL: string[] = CHAMPIONS.filter(
  (c) => c.tier !== "other"
).map((c) => c.id);
