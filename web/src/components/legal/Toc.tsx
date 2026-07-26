"use client";

import { useEffect, useState } from "react";

export function Toc({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const jump = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="On this page" className="text-sm">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        On this page
      </p>
      <ul className="mt-3 space-y-0.5 border-l border-navy-800">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={jump(item.id)}
              aria-current={active === item.id ? "true" : undefined}
              className={`block -ml-px border-l py-1.5 pl-4 leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                active === item.id
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-faint hover:border-navy-700 hover:text-ink-dim"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
