import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, FileText, Tag, X, Loader, Plus } from 'lucide-react';
import { api } from '../api';
import './EntryPointSelector.css';

/**
 * EntryPointSelector - Select notes or topics as entry points for Sleep Time Compute workers
 *
 * Supports two types of entry points:
 * - Notes: Specific notes from the knowledge graph (prefixed with @note:)
 * - Topics: Tags or topic keywords (prefixed with @topic:)
 */
export default function EntryPointSelector({
  selectedEntryPoints,
  onEntryPointsChange,
  disabled = false,
  minRequired = 1,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Parse query to determine search type
  const parseQuery = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return { mode: 'none', term: '' };

    if (trimmed.startsWith('@note:')) {
      return { mode: 'note', term: trimmed.slice(6).trim() };
    }
    if (trimmed.startsWith('@topic:') || trimmed.startsWith('@tag:')) {
      const prefix = trimmed.startsWith('@topic:') ? 7 : 5;
      return { mode: 'topic', term: trimmed.slice(prefix).trim() };
    }

    // Default to note search
    return { mode: 'note', term: trimmed };
  };

  // Perform search
  const performSearch = useCallback(async (searchQuery) => {
    const parsed = parseQuery(searchQuery);

    if (parsed.mode === 'none' || !parsed.term) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      if (parsed.mode === 'note') {
        // Search for notes in knowledge graph
        const response = await api.searchKnowledgeGraph(parsed.term, {
          types: ['note'],
          limit: 10,
        });

        const noteResults = (response.results || []).map(r => ({
          id: r.id,
          type: 'note',
          title: r.name || r.title || r.id,
          subtitle: r.source_title || '',
          tags: r.tags || [],
        }));

        setResults(noteResults);
        setShowDropdown(noteResults.length > 0);
      } else if (parsed.mode === 'topic') {
        // For topics, create a topic entry from the search term
        // Also search for matching notes to show what the topic relates to
        const response = await api.searchKnowledgeGraph(parsed.term, {
          types: ['note'],
          limit: 5,
        });

        const topicResult = {
          id: `topic:${parsed.term.toLowerCase()}`,
          type: 'topic',
          title: parsed.term,
          subtitle: `${(response.results || []).length} related notes`,
          relatedCount: (response.results || []).length,
        };

        setResults([topicResult]);
        setShowDropdown(true);
      }
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add entry point
  const addEntryPoint = useCallback((item) => {
    // Check if already added
    if (selectedEntryPoints.some(ep => ep.id === item.id)) {
      return;
    }

    const newEntryPoint = {
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
    };

    onEntryPointsChange([...selectedEntryPoints, newEntryPoint]);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  }, [selectedEntryPoints, onEntryPointsChange]);

  // Remove entry point
  const removeEntryPoint = useCallback((entryPointId) => {
    onEntryPointsChange(selectedEntryPoints.filter(ep => ep.id !== entryPointId));
  }, [selectedEntryPoints, onEntryPointsChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!showDropdown) {
      if (e.key === 'Escape') {
        setQuery('');
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          addEntryPoint(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  }, [showDropdown, results, selectedIndex, addEntryPoint]);

  const isValid = selectedEntryPoints.length >= minRequired;

  return (
    <div className="entry-point-selector">
      <div className="entry-point-selector-label">
        Entry Points
        {minRequired > 0 ? (
          <span className={`entry-point-required ${isValid ? 'valid' : ''}`}>
            {selectedEntryPoints.length}/{minRequired} required
          </span>
        ) : (
          <span className="entry-point-optional">optional</span>
        )}
      </div>

      {/* Selected entry points */}
      {selectedEntryPoints.length > 0 && (
        <div className="entry-point-chips">
          {selectedEntryPoints.map((ep) => (
            <div
              key={ep.id}
              className={`entry-point-chip entry-point-chip-${ep.type}`}
            >
              {ep.type === 'note' ? <FileText size={12} /> : <Tag size={12} />}
              <span className="entry-point-chip-title">{ep.title}</span>
              {!disabled && (
                <button
                  className="entry-point-chip-remove"
                  onClick={() => removeEntryPoint(ep.id)}
                  type="button"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="entry-point-search-container">
        <div className="entry-point-search-input-wrapper">
          <Search size={14} className="entry-point-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="entry-point-search-input"
            placeholder="Search notes or add @topic:keyword"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query && performSearch(query)}
            disabled={disabled}
          />
          {loading && <Loader size={14} className="entry-point-search-loader" />}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <div ref={dropdownRef} className="entry-point-dropdown">
            {results.map((item, index) => (
              <button
                key={item.id}
                className={`entry-point-dropdown-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => addEntryPoint(item)}
                type="button"
              >
                <div className="entry-point-dropdown-icon">
                  {item.type === 'note' ? <FileText size={14} /> : <Tag size={14} />}
                </div>
                <div className="entry-point-dropdown-content">
                  <div className="entry-point-dropdown-title">{item.title}</div>
                  {item.subtitle && (
                    <div className="entry-point-dropdown-subtitle">{item.subtitle}</div>
                  )}
                </div>
                <Plus size={14} className="entry-point-dropdown-add" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="entry-point-hint">
        Type to search notes, or use @topic:keyword to add a topic
      </div>
    </div>
  );
}
