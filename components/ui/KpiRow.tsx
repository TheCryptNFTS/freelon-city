/**
 * <KpiRow /> + <Kpis /> — the label · value pair that lives at the
 * bottom of every Panel.
 *
 * Renders as a 2-col grid: key (uppercase, dim) · value (mono, ink-2,
 * right-aligned, tabular-nums). When `pinBottom` is true (the default
 * inside a Panel) it uses `margin-top: auto` to push to the bottom.
 */

export function Kpis({
  rows,
  pinBottom = true,
  className,
}: {
  rows: ReadonlyArray<readonly [string, string]>;
  pinBottom?: boolean;
  className?: string;
}) {
  if (!rows || rows.length === 0) return null;
  const cls = ["ui-kpis"];
  if (pinBottom) cls.push("ui-kpis--auto-bottom");
  if (className) cls.push(className);
  return (
    <div className={cls.join(" ")}>
      {rows.map(([k, v], i) => (
        // eslint-disable-next-line react/jsx-key
        <KpiRow key={i} k={k} v={v} />
      ))}
    </div>
  );
}

export function KpiRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </>
  );
}
