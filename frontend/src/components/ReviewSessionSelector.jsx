import React, { useState, useRef, useEffect } from 'react';
import './ReviewSessionSelector.css';

function ReviewSessionSelector({
  sessions,
  activeSessionId,
  onSessionSelect,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const dropdownRef = useRef(null);
  const editInputRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setEditingSessionId(null);
        setDeleteConfirmId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  const handleSelect = (sessionId) => {
    if (sessionId !== activeSessionId) {
      onSessionSelect(sessionId);
    }
    setIsOpen(false);
  };

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditValue(session.name);
    setDeleteConfirmId(null);
  };

  const handleSaveRename = (e) => {
    e.stopPropagation();
    if (editValue.trim() && editingSessionId) {
      onRenameSession(editingSessionId, editValue.trim());
    }
    setEditingSessionId(null);
    setEditValue('');
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveRename(e);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
      setEditValue('');
    }
  };

  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
    setEditingSessionId(null);
  };

  const handleConfirmDelete = (e, sessionId) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const handleCreateNew = (e) => {
    e.stopPropagation();
    onCreateSession();
    setIsOpen(false);
  };

  const getSessionStats = (session) => {
    const commentCount = session.comments?.length || 0;
    const threadCount = session.threads?.length || 0;
    return { commentCount, threadCount };
  };

  const formatSessionName = (name) => {
    if (name.length > 25) {
      return name.substring(0, 22) + '...';
    }
    return name;
  };

  return (
    <div className="review-session-selector" ref={dropdownRef}>
      <button
        className="session-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title={activeSession?.name || 'Select session'}
      >
        <span className="session-name">
          {activeSession ? formatSessionName(activeSession.name) : 'No session'}
        </span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="session-dropdown">
          <div className="session-dropdown-list">
            {sessions.length === 0 ? (
              <div className="session-empty">No sessions yet</div>
            ) : (
              sessions.map((session) => {
                const { commentCount, threadCount } = getSessionStats(session);
                const isActive = session.id === activeSessionId;
                const isEditing = editingSessionId === session.id;
                const isDeleting = deleteConfirmId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`session-option ${isActive ? 'active' : ''}`}
                    onClick={() => !isEditing && !isDeleting && handleSelect(session.id)}
                  >
                    {isDeleting ? (
                      <div className="session-delete-confirm">
                        <span className="delete-message">Delete this session?</span>
                        <div className="delete-actions">
                          <button
                            className="btn-confirm-delete"
                            onClick={(e) => handleConfirmDelete(e, session.id)}
                          >
                            Delete
                          </button>
                          <button
                            className="btn-cancel-delete"
                            onClick={handleCancelDelete}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isEditing ? (
                      <div className="session-rename-form">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleRenameKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          className="session-rename-input"
                        />
                        <button
                          className="btn-save-rename"
                          onClick={handleSaveRename}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="session-info">
                          {isActive && <span className="active-indicator">●</span>}
                          <span className="session-option-name">{session.name}</span>
                        </div>
                        <div className="session-meta">
                          {commentCount > 0 && (
                            <span className="session-stat highlights" title="Highlights">
                              {commentCount} {commentCount === 1 ? 'highlight' : 'highlights'}
                            </span>
                          )}
                          {threadCount > 0 && (
                            <span className="session-stat threads" title="Threads">
                              {threadCount} {threadCount === 1 ? 'thread' : 'threads'}
                            </span>
                          )}
                          <div className="session-actions">
                            <button
                              className="btn-session-action"
                              onClick={(e) => handleStartRename(e, session)}
                              title="Rename"
                            >
                              ✎
                            </button>
                            <button
                              className="btn-session-action delete"
                              onClick={(e) => handleDeleteClick(e, session.id)}
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="session-dropdown-footer">
            <button className="btn-new-session" onClick={handleCreateNew}>
              + New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewSessionSelector;
