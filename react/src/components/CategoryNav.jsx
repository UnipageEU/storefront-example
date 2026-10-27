// Sticky category bar with scroll-spy: the chip of the section under the bar
// is highlighted and scrolled into view inside the bar.
import { useEffect, useRef, useState } from 'react';
import './CategoryNav.css';

const sectionId = (id) => `cat-${id}`;

export default function CategoryNav({ categories }) {
  const [active, setActive] = useState(categories[0]?.id || null);
  const track = useRef(null);
  const clickLock = useRef(0);
  const ids = categories.map((c) => c.id).join(',');

  useEffect(() => {
    if (!categories.some((c) => c.id === active)) setActive(categories[0]?.id || null);
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.dataset.cat, e.isIntersecting ? e.boundingClientRect.top : null);
        if (Date.now() < clickLock.current) return;
        // the first category (in menu order) that is in the band wins
        const first = categories.find((c) => visible.get(c.id) !== null && visible.get(c.id) !== undefined);
        if (first) setActive(first.id);
      },
      // a band just below the sticky header + bar
      { rootMargin: '-120px 0px -55% 0px', threshold: 0 },
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
    const chip = t?.querySelector(`[data-chip="${active}"]`);
    if (chip) t.scrollTo({ left: chip.offsetLeft - t.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  function go(e, id) {
    e.preventDefault();
    setActive(id);
    clickLock.current = Date.now() + 900;
    document.getElementById(sectionId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="catnav" aria-label="Menu categories">
      <div ref={track} className="catnav-track container">
        {categories.map((c) => (
          <a key={c.id} href={`#${sectionId(c.id)}`} data-chip={c.id} className="chip" aria-current={active === c.id ? 'true' : undefined} onClick={(e) => go(e, c.id)}>
            {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
