import { useState, useEffect } from 'react';
import { api } from '../api';
import './QuestionSetEditor.css';

export default function QuestionSetEditor({ questionSet, onSave, onClose }) {
  const isEditing = !!questionSet;

  const [title, setTitle] = useState(questionSet?.title || '');
  const [description, setDescription] = useState(questionSet?.description || '');
  const [questions, setQuestions] = useState(
    questionSet?.questions
      ? Object.entries(questionSet.questions).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const addQuestion = () => {
    setQuestions([...questions, { key: '', value: '' }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleSave = async () => {
    // Validate
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const validQuestions = questions.filter(q => q.key.trim() && q.value.trim());
    if (validQuestions.length === 0) {
      setError('At least one question is required');
      return;
    }

    // Check for duplicate keys
    const keys = validQuestions.map(q => q.key.trim().toLowerCase());
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      setError('Question keys must be unique');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const questionsObj = {};
      validQuestions.forEach(q => {
        questionsObj[q.key.trim()] = q.value.trim();
      });

      if (isEditing) {
        await api.updateQuestionSet(questionSet.filename, {
          questions: questionsObj,
          description: description.trim(),
        });
      } else {
        await api.createQuestionSet(title.trim(), questionsObj, description.trim());
      }

      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save question set');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="question-set-editor-overlay" onClick={onClose}>
      <div className="question-set-editor" onClick={e => e.stopPropagation()}>
        <div className="editor-header">
          <h2>{isEditing ? 'Edit Question Set' : 'Create Question Set'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="editor-content">
          <div className="field-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., B2B SaaS Analysis"
              disabled={isEditing}
            />
            {isEditing && (
              <span className="field-hint">Title cannot be changed after creation</span>
            )}
          </div>

          <div className="field-group">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of what this question set is for..."
              rows={2}
            />
          </div>

          <div className="questions-section">
            <label>Questions</label>
            <p className="section-hint">
              Each question has a key (used in the output) and the actual question text.
            </p>

            {questions.map((q, index) => (
              <div key={index} className="question-row">
                <input
                  type="text"
                  className="question-key"
                  value={q.key}
                  onChange={e => updateQuestion(index, 'key', e.target.value)}
                  placeholder="key"
                />
                <input
                  type="text"
                  className="question-value"
                  value={q.value}
                  onChange={e => updateQuestion(index, 'value', e.target.value)}
                  placeholder="Question text..."
                />
                <button
                  className="remove-question-btn"
                  onClick={() => removeQuestion(index)}
                  disabled={questions.length === 1}
                  title="Remove question"
                >
                  &times;
                </button>
              </div>
            ))}

            <button className="add-question-btn" onClick={addQuestion}>
              + Add Question
            </button>
          </div>

          {error && <div className="editor-error">{error}</div>}
        </div>

        <div className="editor-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}
