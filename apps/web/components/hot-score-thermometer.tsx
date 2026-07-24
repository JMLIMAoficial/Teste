type HotScoreThermometerProps = {
  score: number;
  label?: string;
  /** Barra vertical na lateral — cards */
  overlay?: boolean;
  /** Badge horizontal com barra — perfil */
  badge?: boolean;
};

type HotLevel = {
  label: string;
  gradient: string;
  emoji: string;
};

function getHotLevel(score: number, label?: string): HotLevel {
  const gradient = levelGradient(score);
  if (score >= 76) {
    return { label: label ?? "Em chamas", gradient, emoji: "🔥" };
  }
  if (score >= 51) {
    return { label: label ?? "Quente", gradient, emoji: "🔥" };
  }
  if (score >= 26) {
    return { label: label ?? "Morno", gradient, emoji: "🌡️" };
  }
  return { label: label ?? "Frio", gradient, emoji: "❄️" };
}

function levelGradient(score: number) {
  if (score >= 76) return "from-red-500 via-orange-500 to-amber-400";
  if (score >= 51) return "from-orange-500 via-amber-500 to-yellow-400";
  if (score >= 26) return "from-purple-light via-orange-400 to-amber-300";
  return "from-sky-500 via-blue-400 to-cyan-300";
}

function VerticalHotBar({
  pct,
  gradient,
  className = "",
}: {
  pct: number;
  gradient: string;
  className?: string;
}) {
  return (
    <div
      className={`relative min-h-0 overflow-hidden rounded-full bg-black/40 shadow-inner ring-1 ring-white/20 ${className}`}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${gradient}`}
        style={{ height: `${pct}%` }}
      />
    </div>
  );
}

export function HotScoreThermometer({
  score,
  label,
  overlay = false,
  badge = false,
}: HotScoreThermometerProps) {
  const pct = Math.min(100, Math.max(4, score));
  const level = getHotLevel(score, label);
  const isBlazing = score >= 76;
  const isHot = score >= 51;

  if (overlay) {
    return (
      <div
        className="absolute bottom-10 right-1.5 top-10 z-10 flex w-6 flex-col items-center gap-1"
        aria-label={`${level.label}, ${score} graus`}
        title={`${score}° — ${level.label}`}
      >
        <span className="text-sm leading-none drop-shadow-sm" aria-hidden>
          🔥
        </span>
        <VerticalHotBar pct={pct} gradient={level.gradient} className="w-3 min-h-0 flex-1" />
      </div>
    );
  }

  if (badge) {
    return (
      <div
        className={`inline-flex items-center gap-3 rounded-xl border border-border-subtle px-3 py-2 ${
          isBlazing
            ? "bg-gradient-to-r from-red-950/40 to-bg-tertiary"
            : isHot
              ? "bg-gradient-to-r from-orange-950/30 to-bg-tertiary"
              : "bg-bg-tertiary"
        }`}
        aria-label={`${level.label}, ${score} graus`}
      >
        <span className="text-xl leading-none" aria-hidden>
          {level.emoji}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={`text-lg font-bold tabular-nums leading-none ${
                isBlazing ? "text-orange-300" : isHot ? "text-amber-200" : "text-text-primary"
              }`}
            >
              {score}°
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {level.label}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-bg-primary/80">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${level.gradient}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2" aria-label={`${level.label}, ${score} graus`}>
      <VerticalHotBar pct={pct} gradient={level.gradient} className="h-14 w-2.5" />
      <div className="pb-0.5">
        <span className="mr-1 text-sm" aria-hidden>
          {level.emoji}
        </span>
        <span className="text-xs font-bold tabular-nums text-text-primary">{score}°</span>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          {level.label}
        </p>
      </div>
    </div>
  );
}
