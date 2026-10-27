import Icon from './Icon.jsx';
import './Stepper.css';

/** removable: at 1, the minus button shows a trash icon and removes the line. */
export default function Stepper({ value, onChange, min = 0, max = Infinity, label = 'Quantity', size = 'md', removable = false }) {
  const trash = removable && value <= 1;
  const iconSize = size === 'sm' ? 15 : 18;
  return (
    <div className={`stepper stepper-${size}`} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper-btn"
        disabled={value <= min}
        aria-label={trash ? `Remove ${label}` : `Decrease ${label}`}
        onClick={() => value > min && onChange(value - 1)}
      >
        <Icon name={trash ? 'trash' : 'minus'} size={iconSize} />
      </button>
      <span className="stepper-value tabular" aria-live="polite">{value}</span>
      <button type="button" className="stepper-btn" disabled={value >= max} aria-label={`Increase ${label}`} onClick={() => value < max && onChange(value + 1)}>
        <Icon name="plus" size={iconSize} />
      </button>
    </div>
  );
}
