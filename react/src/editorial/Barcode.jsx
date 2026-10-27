// A decorative barcode at the foot of a receipt: bar widths derived from the
// characters of `value`, so each order gets its own. Not scannable.
export default function Barcode({ value = '' }) {
  const bars = [];
  const chars = String(value || 'unipage').padEnd(12, '7');
  let x = 0;
  for (let i = 0; i < chars.length * 3; i++) {
    const code = chars.charCodeAt(i % chars.length) + i * 7;
    const w = 1 + (code % 3);
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y="0" width={w} height="34" />);
    x += w + 1;
  }
  return (
    <div className="ed-barcode" aria-hidden="true">
      <svg viewBox={`0 0 ${x} 34`} preserveAspectRatio="none" focusable="false">{bars}</svg>
      <span>{String(value)}</span>
    </div>
  );
}
