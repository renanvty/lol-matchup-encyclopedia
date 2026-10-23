// matchupsData.ts
// Tipagem + dados do LoL Matchup Encyclopedia.
//
// Arquivos de dados (mesma pasta):
//   matchups.json   -> guias completos (você edita e publica pelo app)
//   champions.json  -> todos os campeões do jogo (id do Data Dragon + nome)
//   difficulty.json -> ESTIMATIVA de dificuldade por lane, só para preencher
//                      as lacunas onde não existe guia
//
// Edições feitas no app ficam no LocalStorage até você publicá-las
// (botão de download no topo do app) e substituir o matchups.json.
import raw from "./matchups.json";
import championsRaw from "./champions.json";
import difficultyRaw from "./difficulty.json";

export type MatchupStatus = "favoravel" | "skill" | "desfavoravel";
export type Lane = "top" | "jungle" | "mid" | "adc" | "support";

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

// ---------------------------------------------------------------------------
// ÍCONES (Data Dragon)
// ---------------------------------------------------------------------------
// A versão é atualizada em tempo de execução pelo App (ver setDdragonVersion).
// Este valor só é usado até a resposta chegar, ou se estiver sem internet.
let ddragonVersion = "16.21.1";
export const getDdragonVersion = () => ddragonVersion;
export const setDdragonVersion = (v: string) => {
  ddragonVersion = v;
};
export const championIcon = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${id}.png`;

export const STATUS_LABEL: Record<MatchupStatus, string> = {
  favoravel: "Matchup Favorável",
  skill: "Skill Matchup",
  desfavoravel: "Desfavorável",
};

// ---------------------------------------------------------------------------
// LANES
// ---------------------------------------------------------------------------
export const LANES: Lane[] = ["top", "jungle", "mid", "adc", "support"];

export const LANE_LABEL: Record<Lane, string> = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  adc: "ADC",
  support: "Suporte",
};

// ---------------------------------------------------------------------------
// CAMPEÕES
// ---------------------------------------------------------------------------
const MAIN = ["Mordekaiser", "Garen", "Teemo", "Fiora", "Renekton"];
const POOL = ["Nasus", "Riven", "Malphite", "Tryndamere", "Jinx", "KogMaw"];

export const CHAMPIONS: Champion[] = (
  championsRaw as { id: string; name: string }[]
)
  .map((c) => ({
    id: c.id,
    name: c.name,
    tier: MAIN.includes(c.id)
      ? ("main" as const)
      : POOL.includes(c.id)
        ? ("pool" as const)
        : ("other" as const),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const getChampion = (id: string) => CHAMPIONS.find((c) => c.id === id);

// Pool padrão (editável no app)
export const DEFAULT_POOL: string[] = CHAMPIONS.filter(
  (c) => c.tier !== "other"
).map((c) => c.id);

// ---------------------------------------------------------------------------
// DIFICULDADE ESTIMADA POR LANE
// ---------------------------------------------------------------------------
// difficulty.json: { [lane]: { champions: string[], fav: { A: [B, ...] } } }
// "fav[A] inclui B" = A é favorecido contra B (e, por espelho, B é desfavorável
// contra A). Qualquer outro par da mesma lane é "skill matchup".
type RawDifficulty = Record<
  Lane,
  { champions: string[]; fav: Record<string, string[]> }
>;

const DIFF = difficultyRaw as unknown as RawDifficulty;

export const laneChampions: Record<Lane, Set<string>> = Object.fromEntries(
  LANES.map((l) => [l, new Set(DIFF[l].champions)])
) as Record<Lane, Set<string>>;

const favSets: Record<Lane, Map<string, Set<string>>> = Object.fromEntries(
  LANES.map((l) => [
    l,
    new Map(Object.entries(DIFF[l].fav).map(([k, v]) => [k, new Set(v)])),
  ])
) as Record<Lane, Map<string, Set<string>>>;

export const lanesOf = (id: string): Lane[] =>
  LANES.filter((l) => laneChampions[l].has(id));

// Dificuldade estimada de `champ` contra `enemy` numa lane específica.
export const estimate = (
  champ: string,
  enemy: string,
  lane: Lane
): MatchupStatus | undefined => {
  if (champ === enemy) return undefined;
  if (!laneChampions[lane].has(champ) || !laneChampions[lane].has(enemy))
    return undefined;
  if (favSets[lane].get(champ)?.has(enemy)) return "favoravel";
  if (favSets[lane].get(enemy)?.has(champ)) return "desfavoravel";
  return "skill";
};

// Procura a primeira lane (na ordem de LANES) onde os dois aparecem.
export const estimateAnyLane = (
  champ: string,
  enemy: string
): { status: MatchupStatus; lane: Lane } | undefined => {
  for (const lane of LANES) {
    const status = estimate(champ, enemy, lane);
    if (status) return { status, lane };
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// MATCHUPS (GUIAS)
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
