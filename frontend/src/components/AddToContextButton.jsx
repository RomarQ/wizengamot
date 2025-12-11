import './AddToContextButton.css';

export default function AddToContextButton({
  isSelected,
  onToggle,
  label = 'Add to Context',
}) {
  return (
    <button
      type="button"
      className={`context-add-button ${isSelected ? 'selected' : ''}`}
      onClick={onToggle}
      title={isSelected ? 'Remove from context stack' : 'Add this section to the context stack'}
      aria-label={isSelected ? 'Remove from context stack' : label}
      aria-pressed={isSelected}
    >
      <span className="stack-icon" aria-hidden="true">
        <span className="stack-layer layer-bottom" />
        <span className="stack-layer layer-middle" />
        <span className="stack-layer layer-top" />
        <span className="stack-plus">+</span>
      </span>
      <span className="stack-label">
        {isSelected ? 'In Context Stack' : label}
      </span>
    </button>
  );
}
