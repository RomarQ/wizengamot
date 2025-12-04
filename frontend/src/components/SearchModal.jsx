import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import './SearchModal.css';

export default function SearchModal({ isOpen, onClose, onSelectConversation, onNewConversation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Total items includes "New Conversation" at index 0
  const totalItems = results.length + 1;

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
    } else {
      // Search result (index - 1 because index 0 is New Conversation)
      const result = results[index - 1];
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
          {/* New Conversation - always first */}
          <div
            className={`search-result search-result-new ${selectedIndex === 0 ? 'selected' : ''}`}
            onClick={() => handleSelectByIndex(0)}
            onMouseEnter={() => setSelectedIndex(0)}
          >
            <div className="search-result-header">
              <svg className="new-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="search-result-title">New Conversation</span>
            </div>
            <div className="search-result-meta">
              <span className="search-result-hint">Start a new council or synthesizer session</span>
            </div>
          </div>

          {isLoading && (
            <div className="search-loading">Searching...</div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="search-empty">No matching conversations found</div>
          )}

          {!isLoading && results.map((result, index) => (
            <div
              key={result.id}
              className={`search-result ${index + 1 === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelectByIndex(index + 1)}
              onMouseEnter={() => setSelectedIndex(index + 1)}
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
