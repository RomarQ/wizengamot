import { useState, useEffect } from 'react';
import { api } from '../api';
import QuestionSetEditor from './QuestionSetEditor';
import './QuestionSetManager.css';

export default function QuestionSetManager() {
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSet, setEditingSet] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [expandedSet, setExpandedSet] = useState(null);

  useEffect(() => {
    loadQuestionSets();
  }, []);

  const loadQuestionSets = async () => {
    try {
      setLoading(true);
      const sets = await api.listQuestionSets();
      // Load full details for each set
      const fullSets = await Promise.all(
        sets.map(s => api.getQuestionSet(s.filename))
      );
      setQuestionSets(fullSets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSet(null);
    setShowEditor(true);
  };

  const handleEdit = (qs) => {
    setEditingSet(qs);
    setShowEditor(true);
  };

  const handleDelete = async (qs) => {
    if (!confirm(`Delete question set "${qs.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteQuestionSet(qs.filename);
      await loadQuestionSets();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleEditorSave = () => {
    setShowEditor(false);
    setEditingSet(null);
    loadQuestionSets();
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingSet(null);
  };

  const toggleExpand = (filename) => {
    setExpandedSet(expandedSet === filename ? null : filename);
  };

  if (loading) {
    return <div className="question-set-manager loading">Loading question sets...</div>;
  }

  if (error) {
    return <div className="question-set-manager error">Error: {error}</div>;
  }

  return (
    <div className="question-set-manager">
      <div className="manager-header">
        <p className="manager-description">
          Question sets define what information is extracted when analyzing competitor pages.
          Each monitor uses a question set to guide its analysis.
        </p>
        <button className="create-btn" onClick={handleCreate}>
          + New Question Set
        </button>
      </div>

      <div className="question-set-list">
        {questionSets.length === 0 ? (
          <div className="empty-state">
            No question sets found. Create one to get started.
          </div>
        ) : (
          questionSets.map(qs => (
            <div key={qs.filename} className="question-set-card">
              <div className="card-header" onClick={() => toggleExpand(qs.filename)}>
                <div className="card-info">
                  <h3>{qs.title}</h3>
                  {qs.description && <p className="card-description">{qs.description}</p>}
                </div>
                <div className="card-meta">
                  <span className="question-count">
                    {Object.keys(qs.questions || {}).length} questions
                  </span>
                  <span className={`expand-arrow ${expandedSet === qs.filename ? 'expanded' : ''}`}>
                    &#9662;
                  </span>
                </div>
              </div>

              {expandedSet === qs.filename && (
                <div className="card-expanded">
                  <div className="questions-list">
                    {Object.entries(qs.questions || {}).map(([key, value]) => (
                      <div key={key} className="question-item">
                        <span className="question-key">{key}</span>
                        <span className="question-text">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="card-actions">
                    <button className="edit-btn" onClick={() => handleEdit(qs)}>
                      Edit
                    </button>
                    <button className="delete-btn" onClick={() => handleDelete(qs)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showEditor && (
        <QuestionSetEditor
          questionSet={editingSet}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
}
