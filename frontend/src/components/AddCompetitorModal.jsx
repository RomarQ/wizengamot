import { useState } from 'react';
import { api } from '../api';
import './AddCompetitorModal.css';

const PAGE_TYPES = ['homepage', 'pricing', 'about', 'features', 'blog', 'docs', 'custom'];

export default function AddCompetitorModal({ isOpen, onClose, monitorId, onCompetitorAdded }) {
  const [competitorName, setCompetitorName] = useState('');
  const [pages, setPages] = useState([{ url: '', type: 'homepage' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAddPage = () => {
    setPages([...pages, { url: '', type: 'homepage' }]);
  };

  const handleRemovePage = (index) => {
    if (pages.length > 1) {
      setPages(pages.filter((_, i) => i !== index));
    }
  };

  const handlePageChange = (index, field, value) => {
    const newPages = [...pages];
    newPages[index] = { ...newPages[index], [field]: value };
    setPages(newPages);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!competitorName.trim()) {
      setError('Competitor name is required');
      return;
    }

    const validPages = pages.filter(p => p.url.trim());
    if (validPages.length === 0) {
      setError('At least one URL is required');
      return;
    }

    // Basic URL validation
    for (const page of validPages) {
      try {
        new URL(page.url);
      } catch {
        setError(`Invalid URL: ${page.url}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await api.addCompetitor(monitorId, competitorName.trim(), validPages);

      // Reset form
      setCompetitorName('');
      setPages([{ url: '', type: 'homepage' }]);

      if (onCompetitorAdded) {
        onCompetitorAdded();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add competitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCompetitorName('');
    setPages([{ url: '', type: 'homepage' }]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-competitor-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Competitor</h2>

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
          <label className="input-label">Competitor Name</label>
          <input
            type="text"
            className="text-input"
            placeholder="e.g., AcmeAI"
            value={competitorName}
            onChange={(e) => setCompetitorName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="modal-section">
          <label className="input-label">Pages to Track</label>
          <p className="section-description">
            Add the URLs you want to monitor for this competitor
          </p>

          <div className="pages-list">
            {pages.map((page, index) => (
              <div key={index} className="page-entry">
                <input
                  type="text"
                  className="url-input"
                  placeholder="https://example.com/page"
                  value={page.url}
                  onChange={(e) => handlePageChange(index, 'url', e.target.value)}
                />
                <select
                  className="type-select"
                  value={page.type}
                  onChange={(e) => handlePageChange(index, 'type', e.target.value)}
                >
                  {PAGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  className="remove-page-btn"
                  onClick={() => handleRemovePage(index)}
                  disabled={pages.length === 1}
                  title="Remove page"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button className="add-page-btn" onClick={handleAddPage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add another page
          </button>
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
            {isSubmitting ? 'Adding...' : 'Add Competitor'}
          </button>
        </div>
      </div>
    </div>
  );
}
