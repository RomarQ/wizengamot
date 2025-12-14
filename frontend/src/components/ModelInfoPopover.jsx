import { useEffect, useRef, useState } from 'react';
import './ModelInfoPopover.css';

function ModelInfoPopover({ isOpen, type, models, position, onClose, getModelShortName }) {
  const popoverRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fade-in animation
  useEffect(() => {
    if (isOpen) {
      // Delay to trigger CSS transition
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Click outside and escape key handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    // Use mousedown to catch clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = type === 'council' ? 'Council Models' : 'Chairman Model';

  return (
    <div
      ref={popoverRef}
      className={`model-info-popover ${isVisible ? 'visible' : ''}`}
      role="dialog"
      aria-label={title}
      style={{
        top: position.top,
        left: position.left
      }}
    >
      <div className="model-info-popover-arrow" />
      <div className="model-info-popover-header">
        <span className="model-info-popover-title">{title}</span>
        <button
          className="model-info-popover-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className="model-info-popover-content">
        <ul className="model-info-list">
          {models.map((model, index) => (
            <li key={index} className="model-info-item">
              {model}
              <span className="model-short">({getModelShortName(model)})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ModelInfoPopover;
