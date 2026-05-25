import Link from "next/link";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-doc">
      <article>
        <nav className="legal-breadcrumb">
          <Link href="/legal">← All Legal Documents</Link>
        </nav>
        <header>
          <span className="kicker">⬡ LEGAL · {title.toUpperCase()}</span>
          <h1>{title}</h1>
          <p className="updated">Updated: {updated}</p>
        </header>
        <div className="legal-body">{children}</div>
      </article>
    </div>
  );
}
