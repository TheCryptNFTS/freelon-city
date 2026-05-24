/**
 * <ActionCard /> — clickable funnel card.
 *
 * Used by DoThisNow: hero variant is the primary gold-bordered CTA
 * (large display headline, body paragraph, "DO THIS NOW" kicker);
 * default variant is the smaller "BACKUP" card with a number, title,
 * sub, and a GO → footer.
 *
 * If `href` is given the whole card becomes a Link (or <a> when
 * `external`). Otherwise the children are wrapped in a static
 * article so the layout still works inside non-link contexts.
 */
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "default" | "hero";

export function ActionCard({
  variant = "default",
  kicker,
  title,
  sub,
  more,
  href,
  external,
  className,
  children,
}: {
  variant?: Variant;
  kicker?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  more?: ReactNode;
  href?: string;
  external?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const cls = ["ui-action-card"];
  if (variant === "hero") cls.push("ui-action-card--hero");
  if (className) cls.push(className);

  const titleCls =
    variant === "hero"
      ? "ui-action-card__title ui-action-card__title--hero"
      : "ui-action-card__title";
  const subCls =
    variant === "hero"
      ? "ui-action-card__sub ui-action-card__sub--hero"
      : "ui-action-card__sub";

  const body = (
    <>
      {kicker && (
        <span className="kicker" style={variant === "hero" ? { color: "var(--gold)" } : undefined}>
          {kicker}
        </span>
      )}
      {title && (variant === "hero" ? <h2 className={titleCls}>{title}</h2> : <div className={titleCls}>{title}</div>)}
      {sub && <p className={subCls}>{sub}</p>}
      {children}
      {more && <div className="ui-action-card__more">{more}</div>}
    </>
  );

  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={cls.join(" ")}>
        {body}
      </a>
    ) : (
      <Link href={href} className={cls.join(" ")}>
        {body}
      </Link>
    );
  }

  return <article className={cls.join(" ")}>{body}</article>;
}
