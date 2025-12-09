import { useState, useEffect } from 'react';
import { api } from '../api';
import './QuestionSetSelector.css';

export default function QuestionSetSelector({ value, onChange, onEdit }) {
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);

  useEffect(() => {
    loadQuestionSets();
  }, []);

  useEffect(() => {
    if (value && questionSets.length > 0) {
      const current = questionSets.find(qs => qs.filename === value || qs.filename === `${value}.md`);
      setSelectedSet(current || null);
    }
  }, [value, questionSets]);

  const loadQuestionSets = async () => {
    try {
      const sets = await api.listQuestionSets();
      setQuestionSets(sets);
    } catch (err) {
      console.error('Failed to load question sets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (qs) => {
    setSelectedSet(qs);
    onChange(qs.filename);
    setExpanded(false);
  };

  if (loading) {
    return <div className="question-set-selector loading">Loading question sets...</div>;
  }

  return (
    <div className="question-set-selector">
      <div className="selector-header" onClick={() => setExpanded(!expanded)}>
        <div className="selected-info">
          <span className="selected-label">Question Set:</span>
          <span className="selected-value">
            {selectedSet ? selectedSet.title : 'Select a question set'}
          </span>
        </div>
        <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>&#9662;</span>
      </div>

      {expanded && (
        <div className="selector-dropdown">
          {questionSets.map(qs => (
            <div
              key={qs.filename}
              className={`question-set-option ${selectedSet?.filename === qs.filename ? 'selected' : ''}`}
              onClick={() => handleSelect(qs)}
            >
              <div className="option-header">
                <span className="option-title">{qs.title}</span>
                <span className="option-count">{qs.question_count} questions</span>
              </div>
              {qs.description && (
                <div className="option-description">{qs.description}</div>
              )}
            </div>
          ))}

          {onEdit && (
            <div className="selector-actions">
              <button className="edit-sets-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                Manage Question Sets
              </button>
            </div>
          )}
        </div>
      )}

      {selectedSet && !expanded && (
        <div className="selected-preview">
          <div className="preview-label">Questions:</div>
          <ul className="preview-questions">
            {Object.entries(selectedSet.questions || {}).slice(0, 3).map(([key]) => (
              <li key={key}>{key}</li>
            ))}
            {Object.keys(selectedSet.questions || {}).length > 3 && (
              <li className="more">+{Object.keys(selectedSet.questions).length - 3} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
