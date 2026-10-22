// App.tsx — LoL Matchup Encyclopedia (mobile-first, dark hextech UI)
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Swords,
  X,
  Shield,
  Target,
  Lightbulb,
  Quote,
  ArrowLeftRight,
  Star,
  History,
  Settings2,
  Pencil,
  Check,
  RotateCcw,
  Plus,
  Download,
  Crosshair,
  BookOpen,
} from "lucide-react";
import {
  CHAMPIONS,
  DEFAULT_POOL,
  MATCHUPS,
  STATUS_LABEL,
  baseMatchup,
  championIcon,
  getChampion,
  matchupKey,
  sameMatchup,
  type Champion,
  type Matchup,
  type MatchupStatus,
} from "./matchupsData";

type Side = "mine" | "enemy";
type Tab = "matchup" | "counter";

// Mantém a chave antiga para não perder edições já feitas.
const STORAGE_KEY = "lol-toplane-tactics:v2";

interface Saved {
  mine: string | null;
  enemy: string | null;
  recents: { mine: string; enemy: string }[];
  pool: string[];
  custom: Record<string, Matchup>; // edições do usuário, por matchupKey
}

const loadSaved = (): Saved => {
  const fallback: Saved = {
    mine: null,
    enemy: null,
    recents: [],
    pool: DEFAULT_POOL,
    custom: {},
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = { ...fallback, ...(JSON.parse(raw) as Partial<Saved>) };
      // Descarta edições que já foram publicadas no matchups.json
      // (idênticas ao dado de base), mantendo só o que ainda é diferente.
      const custom: Record<string, Matchup> = {};
      for (const [k, m] of Object.entries(saved.custom)) {
        const base = baseMatchup(m.champion, m.enemy);
        if (!base || !sameMatchup(base, m)) custom[k] = m;
      }
      return { ...saved, custom };
    }
  } catch {
    /* ignore */
  }
  return fallback;
};

const STATUS_ORDER: MatchupStatus[] = ["favoravel", "skill", "desfavoravel"];

const downloadJson = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const STATUS_STYLE: Record<MatchupStatus, string> = {
  favoravel: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  skill: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  desfavoravel: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-400/60";

// ---------------------------------------------------------------------------
// Pequenos componentes
// ---------------------------------------------------------------------------
function ChampIcon({ champ, size = 64 }: { champ?: Champion; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [champ?.id]);

  if (!champ || failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-lg font-bold text-slate-400"
      >
        {champ ? champ.name[0] : "?"}
      </div>
    );
  }
  return (
    <img
      src={championIcon(champ.id)}
      alt={champ.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-xl border border-amber-500/40 object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function SideButton({
  label,
  champ,
  onClick,
  accent,
}: {
  label: string;
  champ?: Champion;
  onClick: () => void;
  accent: "gold" | "red";
}) {
  const ring =
    accent === "gold"
      ? "hover:border-amber-400/70 shadow-amber-500/10"
      : "hover:border-rose-400/70 shadow-rose-500/10";
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3 shadow-lg transition ${ring}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <ChampIcon champ={champ} size={72} />
      <span className="min-h-[1.25rem] text-sm font-semibold text-slate-100">
        {champ ? champ.name : "Selecionar"}
      </span>
    </button>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-t-3xl border border-slate-700 bg-slate-950 sm:rounded-3xl">
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-bold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 focus-within:border-amber-400/60">
        <Search size={16} className="text-slate-500" />
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar campeão..."
          className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

function ChampGrid({
  list,
  onPick,
  selected,
}: {
  list: Champion[];
  onPick: (id: string) => void;
  selected?: Set<string>;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {list.map((c) => {
        const on = selected?.has(c.id);
        return (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className={`relative flex flex-col items-center gap-1 rounded-xl p-1.5 transition hover:bg-slate-800 ${
              on ? "bg-amber-400/10 ring-1 ring-amber-400/60" : ""
            }`}
          >
            <ChampIcon champ={c} size={52} />
            {on && (
              <span className="absolute right-1 top-1 rounded-full bg-amber-400 p-0.5 text-slate-900">
                <Check size={10} />
              </span>
            )}
            <span className="w-full truncate text-center text-[11px] text-slate-300">
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seletor de campeão (modal com busca)
// ---------------------------------------------------------------------------
function ChampionPicker({
  title,
  pool,
  showPool,
  onPick,
  onClose,
}: {
  title: string;
  pool: string[];
  showPool: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const poolSet = useMemo(() => new Set(pool), [pool]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAMPIONS.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const inPool = showPool ? filtered.filter((c) => poolSet.has(c.id)) : [];
  const rest = showPool ? filtered.filter((c) => !poolSet.has(c.id)) : filtered;

  return (
    <Modal title={title} onClose={onClose}>
      <SearchBox value={query} onChange={setQuery} />
      <div className="space-y-4 overflow-y-auto px-4 pb-6">
        {inPool.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Star size={12} /> Minha pool
            </p>
            <ChampGrid list={inPool} onPick={onPick} />
          </div>
        )}
        {rest.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {showPool ? "Outros campeões" : "Todos os campeões"}
            </p>
            <ChampGrid list={rest} onPick={onPick} />
          </div>
        )}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            Nenhum campeão encontrado.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Editor de pool
// ---------------------------------------------------------------------------
function PoolEditor({
  pool,
  onChange,
  onClose,
}: {
  pool: string[];
  onChange: (pool: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(pool), [pool]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAMPIONS.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <Modal title="Editar minha pool" onClose={onClose}>
      <div className="flex items-center justify-between px-4 pb-2 text-xs text-slate-400">
        <span>
          {pool.length} campeões na pool. Toque para adicionar ou remover.
        </span>
        <button
          onClick={() => onChange(DEFAULT_POOL)}
          className="flex shrink-0 items-center gap-1 rounded-full border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-amber-400/60"
        >
          <RotateCcw size={12} /> Padrão
        </button>
      </div>
      <SearchBox value={query} onChange={setQuery} />
      <div className="overflow-y-auto px-4 pb-6">
        <ChampGrid list={filtered} onPick={toggle} selected={selected} />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Editor de matchup
// ---------------------------------------------------------------------------
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function MatchupEditor({
  mineId,
  enemyId,
  initial,
  canRestore,
  onSave,
  onRestore,
  onClose,
}: {
  mineId: string;
  enemyId: string;
  initial?: Matchup;
  canRestore: boolean;
  onSave: (m: Matchup) => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<MatchupStatus>(initial?.status ?? "skill");
  const [goldenRule, setGoldenRule] = useState(initial?.goldenRule ?? "");
  const [early, setEarly] = useState(initial?.laning.early ?? "");
  const [mid, setMid] = useState(initial?.laning.mid ?? "");
  const [late, setLate] = useState(initial?.laning.late ?? "");
  const [runes, setRunes] = useState((initial?.setup.runes ?? []).join("\n"));
  const [items, setItems] = useState((initial?.setup.items ?? []).join("\n"));
  const [summary, setSummary] = useState(initial?.summary ?? "");

  const lines = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const save = () =>
    onSave({
      champion: mineId,
      enemy: enemyId,
      status,
      goldenRule: goldenRule.trim(),
      laning: { early: early.trim(), mid: mid.trim(), late: late.trim() },
      setup: { runes: lines(runes), items: lines(items) },
      summary: summary.trim(),
    });

  const title = `${getChampion(mineId)?.name} vs ${getChampion(enemyId)?.name}`;

  return (
    <Modal title={`Editar: ${title}`} onClose={onClose}>
      <div className="space-y-4 overflow-y-auto px-4 pb-4">
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MatchupStatus)}
            className={inputCls}
          >
            {(Object.keys(STATUS_LABEL) as MatchupStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Regra de ouro">
          <textarea
            rows={3}
            value={goldenRule}
            onChange={(e) => setGoldenRule(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="🟢 Nível 1-2">
          <textarea rows={2} value={early} onChange={(e) => setEarly(e.target.value)} className={inputCls} />
        </Field>
        <Field label="🟡 Nível 3-5">
          <textarea rows={2} value={mid} onChange={(e) => setMid(e.target.value)} className={inputCls} />
        </Field>
        <Field label="🔴 Nível 6+">
          <textarea rows={2} value={late} onChange={(e) => setLate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Runas (uma por linha)">
          <textarea rows={4} value={runes} onChange={(e) => setRunes(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Itens / primeira volta (um por linha)">
          <textarea rows={4} value={items} onChange={(e) => setItems(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Resumo em 1 frase">
          <input value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <div className="flex gap-2 border-t border-slate-800 p-4">
        {canRestore && (
          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-rose-400/60"
          >
            <RotateCcw size={14} /> Restaurar
          </button>
        )}
        <button
          onClick={save}
          disabled={!goldenRule.trim()}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-40"
        >
          <Check size={16} /> Salvar
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Counter Finder
// ---------------------------------------------------------------------------
function CounterFinder({
  enemy,
  enemyChamp,
  pool,
  custom,
  onPickEnemy,
  onOpenMatchup,
}: {
  enemy: string | null;
  enemyChamp?: Champion;
  pool: string[];
  custom: Record<string, Matchup>;
  onPickEnemy: () => void;
  onOpenMatchup: (mineId: string) => void;
}) {
  const [onlyPool, setOnlyPool] = useState(true);

  // Todas as matchups contra o inimigo escolhido (base + edições do usuário)
  const candidates = useMemo(() => {
    if (!enemy) return [];
    const map = new Map<string, Matchup>();
    for (const m of MATCHUPS) if (m.enemy === enemy) map.set(m.champion, m);
    for (const m of Object.values(custom)) if (m.enemy === enemy) map.set(m.champion, m);
    const poolSet = new Set(pool);
    return Array.from(map.values()).filter(
      (m) => !onlyPool || poolSet.has(m.champion)
    );
  }, [enemy, custom, pool, onlyPool]);

  const groups: { status: MatchupStatus; title: string; hint: string }[] = [
    { status: "favoravel", title: "Counters", hint: "Matchups favoráveis" },
    { status: "skill", title: "Jogáveis", hint: "Depende de execução" },
    { status: "desfavoravel", title: "Evite", hint: "Matchups desfavoráveis" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
        <p className="mb-3 text-center text-sm text-slate-300">
          Putz, quem “countera” esse boneco?
        </p>
        <button
          onClick={onPickEnemy}
          className="mx-auto flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 transition hover:border-rose-400/70"
        >
          <ChampIcon champ={enemyChamp} size={56} />
          <span className="text-left">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Inimigo
            </span>
            <span className="text-base font-semibold text-slate-100">
              {enemyChamp ? enemyChamp.name : "Selecionar"}
            </span>
          </span>
        </button>

        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={onlyPool}
            onChange={(e) => setOnlyPool(e.target.checked)}
            className="accent-amber-400"
          />
          Só campeões da minha pool
        </label>
      </div>

      {!enemy ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          <Crosshair className="mx-auto mb-2 text-slate-600" />
          Escolha o inimigo para ver os melhores picks contra ele.
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          <Crosshair className="mx-auto mb-2 text-slate-600" />
          Nenhuma matchup cadastrada contra{" "}
          <b className="text-slate-200">{enemyChamp?.name}</b>
          {onlyPool ? " na sua pool. Desmarque o filtro para ver todas." : "."}
        </div>
      ) : (
        groups.map((g) => {
          const list = candidates.filter((m) => m.status === g.status);
          if (list.length === 0) return null;
          return (
            <section key={g.status}>
              <h3 className="mb-2 flex items-baseline gap-2 px-1">
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-widest ${STATUS_STYLE[g.status]}`}
                >
                  {g.title}
                </span>
                <span className="text-xs text-slate-500">{g.hint}</span>
              </h3>
              <ul className="space-y-2">
                {list.map((m) => (
                  <li key={m.champion}>
                    <button
                      onClick={() => onOpenMatchup(m.champion)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 text-left transition hover:border-amber-400/60"
                    >
                      <ChampIcon champ={getChampion(m.champion)} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-100">
                          {getChampion(m.champion)?.name}
                        </span>
                        <span className="line-clamp-2 text-xs text-slate-400">
                          {m.summary}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <p className="px-2 text-center text-[11px] text-slate-500">
        Só aparecem campeões que têm matchup cadastrada contra o inimigo.
        Adicione análises pelo botão de edição para ampliar a lista.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Publicar edições no matchups.json
// ---------------------------------------------------------------------------
function PublishModal({
  custom,
  onClose,
}: {
  custom: Record<string, Matchup>;
  onClose: () => void;
}) {
  const edits = Object.values(custom);

  const exportAll = () => {
    const map = new Map<string, Matchup>();
    for (const m of MATCHUPS) map.set(matchupKey(m.champion, m.enemy), m);
    for (const m of edits) map.set(matchupKey(m.champion, m.enemy), m);
    const all = Array.from(map.values()).sort(
      (a, b) =>
        a.champion.localeCompare(b.champion) || a.enemy.localeCompare(b.enemy)
    );
    downloadJson(all, "matchups.json");
  };

  return (
    <Modal title="Publicar edições no JSON" onClose={onClose}>
      <div className="space-y-4 overflow-y-auto px-4 pb-6 text-sm text-slate-300">
        <p>
          <b className="text-amber-300">{edits.length}</b>{" "}
          {edits.length === 1 ? "matchup editada" : "matchups editadas"} só neste
          navegador.
        </p>

        {edits.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
            {edits.map((m) => (
              <li key={matchupKey(m.champion, m.enemy)}>
                {getChampion(m.champion)?.name} vs {getChampion(m.enemy)?.name}
                {!baseMatchup(m.champion, m.enemy) && (
                  <span className="ml-2 text-emerald-400">nova</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <ol className="list-inside list-decimal space-y-1.5 text-slate-400">
          <li>Baixe o arquivo abaixo (ele já inclui todas as matchups + suas edições).</li>
          <li>
            Substitua <code className="text-slate-200">src/matchups.json</code>{" "}
            no projeto.
          </li>
          <li>
            Recarregue o app: as edições publicadas somem do LocalStorage
            sozinhas, porque passam a ser idênticas ao arquivo.
          </li>
        </ol>

        <button
          onClick={exportAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-900"
        >
          <Download size={16} /> Baixar matchups.json
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// App principal
// ---------------------------------------------------------------------------
export default function App() {
  const saved = useMemo(loadSaved, []);
  const [mine, setMine] = useState<string | null>(saved.mine);
  const [enemy, setEnemy] = useState<string | null>(saved.enemy);
  const [recents, setRecents] = useState(saved.recents);
  const [pool, setPool] = useState(saved.pool);
  const [custom, setCustom] = useState(saved.custom);
  const [picking, setPicking] = useState<Side | null>(null);
  const [editingPool, setEditingPool] = useState(false);
  const [editingMatchup, setEditingMatchup] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [tab, setTab] = useState<Tab>("matchup");

  const mineChamp = mine ? getChampion(mine) : undefined;
  const enemyChamp = enemy ? getChampion(enemy) : undefined;

  const key = mine && enemy ? matchupKey(mine, enemy) : null;
  const base = mine && enemy ? baseMatchup(mine, enemy) : undefined;
  const edited = key ? custom[key] : undefined;
  const matchup = edited ?? base;

  // Persistência
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mine, enemy, recents, pool, custom } satisfies Saved)
      );
    } catch {
      /* ignore */
    }
  }, [mine, enemy, recents, pool, custom]);

  // Histórico de matchups consultadas
  useEffect(() => {
    if (!mine || !enemy) return;
    setRecents((prev) =>
      [
        { mine, enemy },
        ...prev.filter((r) => !(r.mine === mine && r.enemy === enemy)),
      ].slice(0, 5)
    );
  }, [mine, enemy]);

  const handlePick = (id: string) => {
    if (picking === "mine") setMine(id);
    if (picking === "enemy") setEnemy(id);
    setPicking(null);
  };

  const swap = () => {
    setMine(enemy);
    setEnemy(mine);
  };

  const saveMatchup = (m: Matchup) => {
    if (!key) return;
    setCustom((prev) => ({ ...prev, [key]: m }));
    setEditingMatchup(false);
  };

  const restoreMatchup = () => {
    if (!key) return;
    setCustom((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingMatchup(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1428] to-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-4 pb-16">
        {/* Header */}
        <header className="relative py-5 text-center">
          <h1 className="px-10 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-2xl font-extrabold tracking-wide text-transparent">
            LoL Matchup Encyclopedia
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Guia rápido de matchups para o Top Lane
          </p>
          <div className="absolute right-0 top-5 flex gap-2">
            <button
              onClick={() => setPublishing(true)}
              aria-label="Publicar edições no JSON"
              className="relative rounded-full border border-slate-700 p-2 text-slate-400 hover:border-amber-400/60 hover:text-amber-300"
            >
              <Download size={16} />
              {Object.keys(custom).length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
                  {Object.keys(custom).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setEditingPool(true)}
              aria-label="Editar pool"
              className="rounded-full border border-slate-700 p-2 text-slate-400 hover:border-amber-400/60 hover:text-amber-300"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </header>

        {/* Abas */}
        <nav className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-1">
          {(
            [
              { id: "matchup", label: "Matchup", icon: <BookOpen size={15} /> },
              { id: "counter", label: "Counter Finder", icon: <Crosshair size={15} /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-amber-400 text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "counter" && (
          <CounterFinder
            enemy={enemy}
            enemyChamp={enemyChamp}
            pool={pool}
            custom={custom}
            onPickEnemy={() => setPicking("enemy")}
            onOpenMatchup={(mineId) => {
              setMine(mineId);
              setTab("matchup");
            }}
          />
        )}

        {tab === "matchup" && (
        <>
        {/* Hero: seletor de matchup */}
        <div className="flex items-stretch gap-2">
          <SideButton
            label="Meu campeão"
            champ={mineChamp}
            onClick={() => setPicking("mine")}
            accent="gold"
          />
          <div className="flex flex-col items-center justify-center gap-2 px-1">
            <span className="text-xl font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
              VS
            </span>
            <button
              onClick={swap}
              aria-label="Inverter"
              disabled={!mine && !enemy}
              className="rounded-full border border-slate-700 p-1.5 text-slate-400 hover:text-amber-300 disabled:opacity-30"
            >
              <ArrowLeftRight size={14} />
            </button>
          </div>
          <SideButton
            label="Inimigo"
            champ={enemyChamp}
            onClick={() => setPicking("enemy")}
            accent="red"
          />
        </div>

        {/* Recentes */}
        {recents.length > 0 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            <History size={14} className="shrink-0 text-slate-500" />
            {recents.map((r) => (
              <button
                key={`${r.mine}-${r.enemy}`}
                onClick={() => {
                  setMine(r.mine);
                  setEnemy(r.enemy);
                }}
                className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:border-amber-400/60"
              >
                {getChampion(r.mine)?.name} vs {getChampion(r.enemy)?.name}
              </button>
            ))}
          </div>
        )}

        {/* Guia */}
        <main className="mt-6 space-y-4">
          {!mine || !enemy ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              <Swords className="mx-auto mb-2 text-slate-600" />
              Selecione seu campeão e o inimigo para ver o guia.
            </div>
          ) : !matchup ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              <Swords className="mx-auto mb-2 text-slate-600" />
              Ainda não há análise para{" "}
              <b className="text-slate-200">
                {mineChamp?.name} vs {enemyChamp?.name}
              </b>
              .
              <div className="mt-4">
                <button
                  onClick={() => setEditingMatchup(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900"
                >
                  <Plus size={16} /> Criar análise
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-widest ${STATUS_STYLE[matchup.status]}`}
                >
                  {STATUS_LABEL[matchup.status]}
                </span>
                {edited && (
                  <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                    Editada
                  </span>
                )}
                <button
                  onClick={() => setEditingMatchup(true)}
                  aria-label="Editar matchup"
                  className="rounded-full border border-slate-700 p-1.5 text-slate-400 hover:border-amber-400/60 hover:text-amber-300"
                >
                  <Pencil size={13} />
                </button>
              </div>

              {/* Card 1 */}
              <section className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4 shadow-[0_0_24px_rgba(251,191,36,0.08)]">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
                  <Lightbulb size={16} /> A Regra de Ouro
                </h3>
                <p className="text-[15px] font-medium leading-relaxed text-amber-50">
                  {matchup.goldenRule}
                </p>
              </section>

              {/* Card 2 */}
              <Card icon={<Swords size={16} />} title="Resumo de Rota">
                <ul className="space-y-3 text-sm leading-relaxed text-slate-200">
                  <li className="flex gap-2">
                    <span>🟢</span>
                    <span>{matchup.laning.early}</span>
                  </li>
                  <li className="flex gap-2">
                    <span>🟡</span>
                    <span>{matchup.laning.mid}</span>
                  </li>
                  <li className="flex gap-2">
                    <span>🔴</span>
                    <span>{matchup.laning.late}</span>
                  </li>
                </ul>
              </Card>

              {/* Card 3 */}
              <Card icon={<Shield size={16} />} title="Setup Recomendado">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-300">
                      <Target size={14} /> Runas do duelo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {matchup.setup.runes.map((r) => (
                        <span
                          key={r}
                          className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-200"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-300">
                      <Shield size={14} /> Primeira volta / itemização
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-slate-200">
                      {matchup.setup.items.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Card 4 */}
              <Card icon={<Quote size={16} />} title="Resumo em 1 Frase">
                <p className="text-center text-base font-semibold italic text-amber-100">
                  “{matchup.summary}”
                </p>
              </Card>
            </>
          )}
        </main>
        </>
        )}
      </div>

      {publishing && (
        <PublishModal custom={custom} onClose={() => setPublishing(false)} />
      )}

      {picking && (
        <ChampionPicker
          title={picking === "mine" ? "Escolha seu campeão" : "Escolha o inimigo"}
          pool={pool}
          showPool={picking === "mine"}
          onPick={handlePick}
          onClose={() => setPicking(null)}
        />
      )}

      {editingPool && (
        <PoolEditor
          pool={pool}
          onChange={setPool}
          onClose={() => setEditingPool(false)}
        />
      )}

      {editingMatchup && mine && enemy && (
        <MatchupEditor
          mineId={mine}
          enemyId={enemy}
          initial={matchup}
          canRestore={!!edited}
          onSave={saveMatchup}
          onRestore={restoreMatchup}
          onClose={() => setEditingMatchup(false)}
        />
      )}
    </div>
  );
}
