import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import './SearchModal.css';

export default function SearchModal({ isOpen, onClose, onSelectConversation, onNewConversation, theme, onToggleTheme, onOpenSettings }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Total items: 3 actions (New, Theme, Settings) + search results
  const ACTION_COUNT = 3;
  const totalItems = results.length + ACTION_COUNT;

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.searchConversations(searchQuery);
      setResults(response.results || []);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle query change with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, doSearch]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectByIndex(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectByIndex = (index) => {
    if (index === 0) {
      // New Conversation
      onClose();
      onNewConversation();
    } else if (index === 1) {
      // Toggle Theme
      onToggleTheme?.();
    } else if (index === 2) {
      // Open Settings
      onClose();
      onOpenSettings?.();
    } else {
      // Search result (index - ACTION_COUNT)
      const result = results[index - ACTION_COUNT];
      if (result) {
        onSelectConversation(result.id);
        onClose();
      }
    }
  };

  // Format relative time
  const formatRelativeTime = (isoDate) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search conversations..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="search-hint">
            <kbd>esc</kbd> to close
          </span>
        </div>

        <div className="search-results">
          {/* Action items - always shown */}
          <div className="search-actions">
            {/* New Conversation */}
            <div
              className={`search-action ${selectedIndex === 0 ? 'selected' : ''}`}
              onClick={() => handleSelectByIndex(0)}
              onMouseEnter={() => setSelectedIndex(0)}
            >
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="action-label">New Conversation</span>
            </div>

            {/* Toggle Theme */}
            <div
              className={`search-action ${selectedIndex === 1 ? 'selected' : ''}`}
              onClick={() => handleSelectByIndex(1)}
              onMouseEnter={() => setSelectedIndex(1)}
            >
              {theme === 'dark' ? (
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span className="action-label">{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              <kbd className="action-badge">{theme === 'dark' ? 'Light' : 'Dark'}</kbd>
            </div>

            {/* Settings */}
            <div
              className={`search-action ${selectedIndex === 2 ? 'selected' : ''}`}
              onClick={() => handleSelectByIndex(2)}
              onMouseEnter={() => setSelectedIndex(2)}
            >
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="action-label">Settings</span>
            </div>
          </div>

          <div className="search-divider" />

          {isLoading && (
            <div className="search-loading">Searching...</div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="search-empty">No matching conversations found</div>
          )}

          {!isLoading && results.map((result, index) => (
            <div
              key={result.id}
              className={`search-result ${index + ACTION_COUNT === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelectByIndex(index + ACTION_COUNT)}
              onMouseEnter={() => setSelectedIndex(index + ACTION_COUNT)}
            >
              <div className="search-result-header">
                <span className="search-result-title">{result.title}</span>
                <span className={`search-result-mode ${result.mode}`}>
                  {result.mode}
                </span>
              </div>
              <div className="search-result-meta">
                <span className="search-result-time">{formatRelativeTime(result.created_at)}</span>
                <span className="search-result-score">
                  {Math.round(result.similarity * 100)}% match
                </span>
              </div>
            </div>
          ))}

          {!query && !isLoading && (
            <div className="search-hint-text">
              Type to search by content, title, or topic
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
