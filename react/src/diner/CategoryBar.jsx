// The categories, sticky under the top bar: the one in view is underlined.
import { useEffect, useRef, useState } from 'react';

export const sectionId = (id) => `dn-cat-${id}`;

export default function CategoryBar({ categories }) {
  const [active, setActive] = useState(categories[0]?.id || null);
  const track = useRef(null);
  const clickLock = useRef(0);
  const ids = categories.map((c) => c.id).join(',');

  useEffect(() => {
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.dataset.cat, e.isIntersecting);
        if (Date.now() < clickLock.current) return;
        const first = categories.find((c) => visible.get(c.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    );
    for (const c of categories) {
      const el = document.getElementById(sectionId(c.id));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  useEffect(() => {
    const t = track.current;
    const item = t?.querySelector(`[data-cat-link="${active}"]`);
    // centre the active category; the first ones clamp to the start
    if (item) t.scrollTo({ left: item.offsetLeft - t.clientWidth / 2 + item.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  function go(e, id) {
    e.preventDefault();
    setActive(id);
    clickLock.current = Date.now() + 900;
    document.getElementById(sectionId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="dn-cats" aria-label="Menu categories">
      <div ref={track} className="dn-wrap dn-cats-track">
        {categories.map((c) => (
          <a
            key={c.id}
            href={`#${sectionId(c.id)}`}
            data-cat-link={c.id}
            className="dn-cats-item"
            aria-current={active === c.id ? 'true' : undefined}
            onClick={(e) => go(e, c.id)}
          >
            {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
