// The table of contents, sticky under the masthead: one entry per chapter
// (menu category), the chapter in view is marked.
import { useEffect, useRef, useState } from 'react';
import { roman } from './roman.js';

export const chapterId = (id) => `ed-cat-${id}`;

export default function Contents({ categories }) {
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
      { rootMargin: '-110px 0px -60% 0px', threshold: 0 },
    );
    for (const c of categories) {
      const el = document.getElementById(chapterId(c.id));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  useEffect(() => {
    const t = track.current;
    const item = t?.querySelector(`[data-chapter="${active}"]`);
    // centre the active chapter, like the classic category bar; the first ones clamp to the start
    if (item) t.scrollTo({ left: item.offsetLeft - t.clientWidth / 2 + item.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  function go(e, id) {
    e.preventDefault();
    setActive(id);
    clickLock.current = Date.now() + 900;
    document.getElementById(chapterId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="ed-contents" aria-label="Contents">
      <div ref={track} className="ed-wrap ed-contents-track">
        <span className="ed-contents-label" aria-hidden="true">Contents</span>
        {categories.map((c, i) => (
          <a
            key={c.id}
            href={`#${chapterId(c.id)}`}
            data-chapter={c.id}
            className="ed-contents-item"
            aria-current={active === c.id ? 'true' : undefined}
            onClick={(e) => go(e, c.id)}
          >
            <span className="ed-contents-no">{roman(i + 1)}</span> {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
