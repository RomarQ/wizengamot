import { useState } from 'react';
import { api } from '../api';
import './AddPageModal.css';

const PAGE_TYPES = ['homepage', 'pricing', 'about', 'features', 'blog', 'docs', 'custom'];

export default function AddPageModal({
  isOpen,
  onClose,
  monitorId,
  competitorId,
  competitorName,
  onPageAdded,
}) {
  const [url, setUrl] = useState('');
  const [pageType, setPageType] = useState('homepage');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setError(null);

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.addPage(monitorId, competitorId, url.trim(), pageType);

      // Reset form
      setUrl('');
      setPageType('homepage');

      if (onPageAdded) {
        onPageAdded();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add page');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setPageType('homepage');
    setError(null);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-page-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Page to {competitorName}</h2>

        {error && (
          <div className="modal-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        <div className="modal-section">
          <label className="input-label">Page URL</label>
          <input
            type="text"
            className="text-input"
            placeholder="https://example.com/page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="modal-section">
          <label className="input-label">Page Type</label>
          <select
            className="type-select-full"
            value={pageType}
            onChange={(e) => setPageType(e.target.value)}
          >
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn-primary btn-orange"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Page'}
          </button>
        </div>
      </div>
    </div>
  );
}
