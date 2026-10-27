// Inline SVG icons (stroke style).
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  bag: '<path d="M5.5 8h13l-1 12.5h-11L5.5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.2a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.5"/>',
  phone: '<path d="M5 4h3.5l2 5-2.4 1.6a11 11 0 0 0 5.3 5.3l1.6-2.4 5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
  alert: '<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4.5M12 17v.2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  store: '<path d="M4 9.5 5.2 4h13.6L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5 12v8h14v-8M10 20v-5h4v5"/>',
  bike: '<circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M5.5 17 9 9h5l4.5 8M9 9 7.5 5.5H5M14 9l-2.5 8H5.5M15 5.5h2.5"/>',
  tag: '<path d="M3 12.2V4h8.2l9.3 9.3-8.2 8.2L3 12.2Z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  utensils: '<path d="M7 3v7.5a2 2 0 0 0 4 0V3M9 12.5V21M17 3c-2.2 2.2-2.5 6.6 0 9v9"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
  note: '<path d="M5 4h10l4 4v12H5V4Z"/><path d="M15 4v4h4M9 12h6M9 16h4"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.2-3.7 4.3-5.5 8-5.5s6.8 1.8 8 5.5"/>',
  flame: '<path d="M12 21c-4 0-7-2.7-7-6.6 0-3.6 2.6-5.5 4-8.4.6 2 1.7 3 3 3.4C12 6.2 13.3 4 15 3c.3 3 4 5.5 4 10.4 0 4.3-3 7.6-7 7.6Z"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  wheat: '<path d="M12 21V9"/><path d="M12 9c-2.5 0-4-1.8-4-4.5C10.5 4.5 12 6.3 12 9ZM12 9c2.5 0 4-1.8 4-4.5-2.5 0-4 1.8-4 4.5ZM12 14c-2.5 0-4-1.8-4-4.5 2.5 0 4 1.8 4 4.5ZM12 14c2.5 0 4-1.8 4-4.5-2.5 0-4 1.8-4 4.5Z"/>',
};

export default function Icon({ name, size = 20, stroke = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }}
    />
  );
}
