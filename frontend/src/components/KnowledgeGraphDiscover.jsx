import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Check, XCircle, Edit3, ChevronDown, ChevronUp, ExternalLink, Maximize2, Minimize2, FileText, Clock } from 'lucide-react';
import { api } from '../api';
import ReactMarkdown from 'react-markdown';
import ChatInput from './ChatInput';

/**
 * KnowledgeGraphDiscover - Discovery panel for finding connections
 * Uses Claude Opus 4.5 to analyze the knowledge graph and suggest bridge notes
 */
export default function KnowledgeGraphDiscover({
  onClose,
  onSelectConversation,
  onRefreshGraph,
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [discoveries, setDiscoveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDiscovery, setSelectedDiscovery] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [filter, setFilter] = useState('pending');
  const [expandedDiscoveries, setExpandedDiscoveries] = useState(new Set());
  const [fullScreen, setFullScreen] = useState(false);
  const [sourceNotesData, setSourceNotesData] = useState({});
  const [loadingNotes, setLoadingNotes] = useState(new Set());
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  // Example prompts for user guidance
  const examplePrompts = [
    "Find connections between AI and philosophy",
    "What patterns am I missing in my research?",
    "Suggest bridge notes connecting different domains",
  ];

  // Load discoveries on mount
  useEffect(() => {
    loadDiscoveries();
    loadStats();
  }, []);

  const loadDiscoveries = useCallback(async () => {
    try {
      const result = await api.listDiscoveries({ status: filter === 'all' ? null : filter });
      setDiscoveries(result.discoveries || []);
    } catch (err) {
      console.error('Failed to load discoveries:', err);
    }
  }, [filter]);

  const loadStats = useCallback(async () => {
    try {
      const result = await api.getDiscoveryStats();
      setStats(result);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Reload when filter changes
  useEffect(() => {
    loadDiscoveries();
  }, [filter, loadDiscoveries]);

  // Fetch note data for a discovery
  const fetchNoteData = useCallback(async (noteId) => {
    if (sourceNotesData[noteId] || loadingNotes.has(noteId)) return;

    setLoadingNotes(prev => new Set(prev).add(noteId));

    try {
      // noteId format: "note:conversationId:noteId"
      const parts = noteId.split(':');
      if (parts.length >= 3) {
        const conversationId = parts[1];
        const conv = await api.getConversation(conversationId);

        if (conv) {
          // Find the note in the conversation
          for (const msg of conv.messages || []) {
            if (msg.role === 'assistant' && msg.notes) {
              const note = msg.notes.find(n => n.id === parts[2]);
              if (note) {
                setSourceNotesData(prev => ({
                  ...prev,
                  [noteId]: {
                    ...note,
                    sourceTitle: conv.title,
                    conversationId,
                  }
                }));
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch note:', noteId, err);
    } finally {
      setLoadingNotes(prev => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  }, [sourceNotesData, loadingNotes]);

  // Toggle note expansion and fetch data if needed
  const toggleNoteExpanded = (noteId) => {
    if (!expandedNotes.has(noteId)) {
      fetchNoteData(noteId);
    }
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  // Run discovery
  const handleRunDiscovery = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setStatus({ phase: 'starting', progress: 0 });

    try {
      const result = await api.runDiscovery(prompt.trim());

      if (result.error) {
        setError(result.error);
      } else {
        setDiscoveries(prev => [...(result.discoveries || []), ...prev]);
        setPrompt('');
        loadStats();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  // Approve discovery
  const handleApprove = async (discovery) => {
    try {
      const edits = editMode ? {
        title: editedTitle || discovery.suggested_title,
        body: editedBody || discovery.suggested_body,
        tags: editedTags ? editedTags.split(',').map(t => t.trim()).filter(Boolean) : discovery.suggested_tags,
      } : null;

      const result = await api.approveDiscovery(discovery.id, edits);

      if (result.error) {
        setError(result.error);
      } else {
        setDiscoveries(prev => prev.filter(d => d.id !== discovery.id));
        setSelectedDiscovery(null);
        setEditMode(false);
        loadStats();
        if (onRefreshGraph) onRefreshGraph();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Dismiss discovery
  const handleDismiss = async (discovery) => {
    try {
      await api.dismissDiscovery(discovery.id);
      setDiscoveries(prev => prev.filter(d => d.id !== discovery.id));
      setSelectedDiscovery(null);
      loadStats();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle expanded state for a discovery
  const toggleExpanded = (discoveryId) => {
    setExpandedDiscoveries(prev => {
      const next = new Set(prev);
      if (next.has(discoveryId)) {
        next.delete(discoveryId);
      } else {
        next.add(discoveryId);
      }
      return next;
    });
  };

  // Open detail/edit modal
  const openDetail = (discovery) => {
    setSelectedDiscovery(discovery);
    setEditedTitle(discovery.suggested_title);
    setEditedBody(discovery.suggested_body);
    setEditedTags(discovery.suggested_tags?.join(', ') || '');
    setEditMode(false);
    // Pre-fetch all source notes
    discovery.source_notes?.forEach(noteId => fetchNoteData(noteId));
  };

  // Format relative time
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Render a source note card
  const renderSourceNote = (noteId, compact = false) => {
    const noteData = sourceNotesData[noteId];
    const isExpanded = expandedNotes.has(noteId);
    const isLoading = loadingNotes.has(noteId);

    // Extract just the note ID for display
    const shortId = noteId.split(':').pop();

    if (compact) {
      return (
        <div key={noteId} className="kg-discover-source-note-compact">
          <button
            className="kg-discover-source-note-btn"
            onClick={() => toggleNoteExpanded(noteId)}
          >
            <FileText size={14} />
            <span className="kg-discover-source-note-title">
              {noteData?.title || shortId}
            </span>
            {isLoading && <Loader size={12} className="kg-spinner" />}
            {!isLoading && (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>

          {isExpanded && noteData && (
            <div className="kg-discover-source-note-content">
              {noteData.sourceTitle && (
                <div className="kg-discover-source-note-source">
                  From: {noteData.sourceTitle}
                </div>
              )}
              <div className="kg-discover-source-note-body markdown-content">
                <ReactMarkdown>{noteData.body}</ReactMarkdown>
              </div>
              {noteData.tags?.length > 0 && (
                <div className="kg-discover-source-note-tags">
                  {noteData.tags.map((tag, idx) => (
                    <span key={idx} className="kg-discover-tag">{tag}</span>
                  ))}
                </div>
              )}
              {noteData.conversationId && (
                <button
                  className="kg-discover-view-conv-btn"
                  onClick={() => onSelectConversation && onSelectConversation(noteData.conversationId)}
                >
                  <ExternalLink size={12} /> View in Conversation
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    // Full card view for modal
    return (
      <div key={noteId} className="kg-discover-source-note-full">
        <div className="kg-discover-source-note-header">
          <FileText size={16} />
          <span className="kg-discover-source-note-title">
            {noteData?.title || shortId}
          </span>
          {isLoading && <Loader size={14} className="kg-spinner" />}
        </div>
        {noteData ? (
          <>
            {noteData.sourceTitle && (
              <div className="kg-discover-source-note-source">
                From: {noteData.sourceTitle}
              </div>
            )}
            <div className="kg-discover-source-note-body markdown-content">
              <ReactMarkdown>{noteData.body}</ReactMarkdown>
            </div>
            {noteData.tags?.length > 0 && (
              <div className="kg-discover-source-note-tags">
                {noteData.tags.map((tag, idx) => (
                  <span key={idx} className="kg-discover-tag">{tag}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="kg-discover-source-note-loading">
            {isLoading ? 'Loading note...' : 'Note not found'}
          </div>
        )}
      </div>
    );
  };

  // Render discovery card
  const renderDiscoveryCard = (discovery) => {
    const isExpanded = expandedDiscoveries.has(discovery.id);

    return (
      <div key={discovery.id} className="kg-discover-card">
        <div className="kg-discover-card-header" onClick={() => toggleExpanded(discovery.id)}>
          <div className="kg-discover-card-icon">
            <Sparkles size={16} />
          </div>
          <div className="kg-discover-card-title">
            {discovery.suggested_title || 'Untitled Bridge Note'}
          </div>
          <button className="kg-discover-expand-btn">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isExpanded && (
          <div className="kg-discover-card-body">
            {/* Show the prompt that generated this discovery */}
            {discovery.user_prompt && (
              <div className="kg-discover-prompt-info">
                <Clock size={12} />
                <span>Prompt: "{discovery.user_prompt}"</span>
                <span className="kg-discover-time">{formatTime(discovery.created_at)}</span>
              </div>
            )}

            <div className="kg-discover-card-meta">
              <span className="kg-discover-strength" data-strength={discovery.connection_strength}>
                {discovery.connection_strength}
              </span>
              <span className="kg-discover-type">
                {discovery.connection_type}
              </span>
            </div>

            <div className="kg-discover-reasoning">
              {discovery.reasoning}
            </div>

            <div className="kg-discover-sources">
              <strong>Connects {discovery.source_notes?.length || 0} Notes:</strong>
              <div className="kg-discover-sources-list">
                {discovery.source_notes?.map((noteId) => renderSourceNote(noteId, true))}
              </div>
            </div>

            <div className="kg-discover-preview">
              <div className="kg-discover-preview-label">Suggested Bridge Note:</div>
              <div className="kg-discover-preview-body markdown-content">
                <ReactMarkdown>{discovery.suggested_body}</ReactMarkdown>
              </div>
              <div className="kg-discover-preview-tags">
                {discovery.suggested_tags?.map((tag, idx) => (
                  <span key={idx} className="kg-discover-tag">{tag}</span>
                ))}
              </div>
            </div>

            <div className="kg-discover-card-actions">
              <button
                className="kg-btn kg-btn-small kg-btn-primary"
                onClick={(e) => { e.stopPropagation(); openDetail(discovery); }}
              >
                <Edit3 size={14} /> Preview & Edit
              </button>
              <button
                className="kg-btn kg-btn-small kg-btn-success"
                onClick={(e) => { e.stopPropagation(); handleApprove(discovery); }}
              >
                <Check size={14} /> Approve
              </button>
              <button
                className="kg-btn kg-btn-small kg-btn-danger"
                onClick={(e) => { e.stopPropagation(); handleDismiss(discovery); }}
              >
                <XCircle size={14} /> Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`kg-discover-panel ${fullScreen ? 'kg-discover-fullscreen' : ''}`}>
      <div className="kg-discover-header">
        <div className="kg-discover-title">
          <Sparkles size={18} />
          <span>Knowledge Discovery</span>
        </div>
        <div className="kg-discover-header-actions">
          <button
            className="kg-icon-btn"
            onClick={() => setFullScreen(!fullScreen)}
            title={fullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {fullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button className="kg-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Prompt input */}
      <div className="kg-discover-input-section">
        <ChatInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleRunDiscovery}
          placeholder="What connections would you like to explore?"
          disabled={loading}
          loading={loading}
          rows={2}
          minHeight="60px"
          maxHeight="120px"
          hint="Enter to send"
        />

        {/* Example prompts */}
        <div className="kg-discover-examples">
          {examplePrompts.map((example, idx) => (
            <button
              key={idx}
              className="kg-discover-example"
              onClick={() => setPrompt(example)}
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Status/Error */}
      {error && (
        <div className="kg-discover-error">
          {error}
        </div>
      )}

      {loading && status && (
        <div className="kg-discover-status">
          <div className="kg-discover-status-phase">
            {status.phase === 'starting' && 'Starting discovery...'}
            {status.phase === 'searching' && 'Searching knowledge base...'}
            {status.phase === 'analyzing' && 'Analyzing connections...'}
            {status.phase === 'generating' && 'Generating bridge notes...'}
          </div>
          <div className="kg-discover-progress">
            <div
              className="kg-discover-progress-bar"
              style={{ width: `${status.progress || 10}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="kg-discover-stats">
          <span>{stats.pending} pending</span>
          <span>{stats.approved} approved</span>
          <span>{stats.dismissed} dismissed</span>
        </div>
      )}

      {/* Filter */}
      <div className="kg-discover-filter">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="kg-discover-filter-select"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Discoveries list */}
      <div className="kg-discover-list">
        {discoveries.length === 0 ? (
          <div className="kg-discover-empty">
            <Sparkles size={32} strokeWidth={1} />
            <p>No discoveries yet</p>
            <p className="kg-discover-empty-hint">
              Enter a prompt above to find hidden connections in your knowledge graph
            </p>
          </div>
        ) : (
          discoveries.map(renderDiscoveryCard)
        )}
      </div>

      {/* Detail/Edit Modal */}
      {selectedDiscovery && (
        <div className="kg-discover-modal-overlay" onClick={() => setSelectedDiscovery(null)}>
          <div className="kg-discover-modal kg-discover-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="kg-discover-modal-header">
              <h3>Bridge Note Preview</h3>
              <button className="kg-icon-btn" onClick={() => setSelectedDiscovery(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="kg-discover-modal-body">
              <div className="kg-discover-modal-columns">
                {/* Left column: Source notes */}
                <div className="kg-discover-modal-col">
                  <h4>Source Notes ({selectedDiscovery.source_notes?.length || 0})</h4>
                  <div className="kg-discover-source-notes-list">
                    {selectedDiscovery.source_notes?.map((noteId) => renderSourceNote(noteId, false))}
                  </div>
                </div>

                {/* Right column: Bridge note */}
                <div className="kg-discover-modal-col">
                  <h4>Bridge Note</h4>

                  {/* Title */}
                  <div className="kg-discover-field">
                    <label>Title</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="kg-discover-edit-input"
                      />
                    ) : (
                      <div className="kg-discover-field-value">{selectedDiscovery.suggested_title}</div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="kg-discover-field">
                    <label>Content</label>
                    {editMode ? (
                      <textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        className="kg-discover-edit-textarea"
                        rows={8}
                      />
                    ) : (
                      <div className="kg-discover-field-value markdown-content">
                        <ReactMarkdown>{selectedDiscovery.suggested_body}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="kg-discover-field">
                    <label>Tags</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedTags}
                        onChange={(e) => setEditedTags(e.target.value)}
                        className="kg-discover-edit-input"
                        placeholder="tag1, tag2, tag3"
                      />
                    ) : (
                      <div className="kg-discover-field-tags">
                        {selectedDiscovery.suggested_tags?.map((tag, idx) => (
                          <span key={idx} className="kg-discover-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reasoning */}
                  <div className="kg-discover-field">
                    <label>Why Connected</label>
                    <div className="kg-discover-field-value kg-discover-reasoning-detail">
                      {selectedDiscovery.reasoning}
                    </div>
                  </div>

                  {/* Original prompt */}
                  {selectedDiscovery.user_prompt && (
                    <div className="kg-discover-field">
                      <label>Discovery Prompt</label>
                      <div className="kg-discover-field-value kg-discover-prompt-detail">
                        "{selectedDiscovery.user_prompt}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="kg-discover-modal-actions">
              <button
                className="kg-btn kg-btn-secondary"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit3 size={14} />
                {editMode ? 'Cancel Edit' : 'Edit Before Save'}
              </button>
              <button
                className="kg-btn kg-btn-danger"
                onClick={() => handleDismiss(selectedDiscovery)}
              >
                <XCircle size={14} /> Dismiss
              </button>
              <button
                className="kg-btn kg-btn-success"
                onClick={() => handleApprove(selectedDiscovery)}
              >
                <Check size={14} /> {editMode ? 'Save & Approve' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
