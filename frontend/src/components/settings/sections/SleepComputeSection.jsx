import { useState, useEffect } from 'react';
import {
  Moon,
  Settings,
  Sparkles,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '../../../api';
import './SleepComputeSection.css';

export default function SleepComputeSection({
  sleepComputeSettings,
  loading,
  setLoading,
  setError,
  setSuccess,
  onReload,
}) {
  // Budget defaults state
  const [defaultDepth, setDefaultDepth] = useState(2);
  const [defaultMaxNotes, setDefaultMaxNotes] = useState(30);
  const [defaultTurns, setDefaultTurns] = useState(3);
  const [model, setModel] = useState('');
  const [settingsDirty, setSettingsDirty] = useState(false);

  // Brainstorm styles state
  const [styles, setStyles] = useState([]);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [editingStyle, setEditingStyle] = useState(null);
  const [styleForm, setStyleForm] = useState({
    name: '',
    description: '',
    initialPrompt: '',
    expansionPrompt: '',
  });
  const [styleDirty, setStyleDirty] = useState(false);
  const [expandedStyles, setExpandedStyles] = useState(new Set());

  // Initialize from settings
  useEffect(() => {
    if (sleepComputeSettings && !settingsDirty) {
      setDefaultDepth(sleepComputeSettings.default_depth || 2);
      setDefaultMaxNotes(sleepComputeSettings.default_max_notes || 30);
      setDefaultTurns(sleepComputeSettings.default_turns || 3);
      setModel(sleepComputeSettings.model || '');
    }
  }, [sleepComputeSettings, settingsDirty]);

  // Load brainstorm styles
  useEffect(() => {
    const loadStyles = async () => {
      try {
        const result = await api.listBrainstormStyles();
        setStyles(result.styles || []);
      } catch (err) {
        console.error('Failed to load brainstorm styles:', err);
      } finally {
        setStylesLoading(false);
      }
    };
    loadStyles();
  }, []);

  // Budget settings handlers
  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateSleepComputeSettings({
        defaultDepth,
        defaultMaxNotes,
        defaultTurns,
        model: model || null,
      });
      setSuccess('Sleep compute settings saved successfully');
      setSettingsDirty(false);
      await onReload();
    } catch (err) {
      setError('Failed to save sleep compute settings');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    if (sleepComputeSettings) {
      setDefaultDepth(sleepComputeSettings.default_depth || 2);
      setDefaultMaxNotes(sleepComputeSettings.default_max_notes || 30);
      setDefaultTurns(sleepComputeSettings.default_turns || 3);
      setModel(sleepComputeSettings.model || '');
    }
    setSettingsDirty(false);
  };

  // Style handlers
  const handleToggleStyle = async (styleId, currentEnabled) => {
    setLoading(true);
    setError('');

    try {
      if (currentEnabled) {
        await api.disableBrainstormStyle(styleId);
      } else {
        await api.enableBrainstormStyle(styleId);
      }
      // Reload styles
      const result = await api.listBrainstormStyles();
      setStyles(result.styles || []);
      setSuccess(`Style ${currentEnabled ? 'disabled' : 'enabled'}`);
    } catch (err) {
      setError(err.message || 'Failed to toggle style');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStyle = async (style) => {
    // Load full style with prompts
    try {
      const fullStyle = await api.getBrainstormStyle(style.id);
      setEditingStyle(style.id);
      setStyleForm({
        name: fullStyle.name || '',
        description: fullStyle.description || '',
        initialPrompt: fullStyle.initial_prompt || '',
        expansionPrompt: fullStyle.expansion_prompt || '',
      });
      setStyleDirty(false);
    } catch (err) {
      setError('Failed to load style details');
    }
  };

  const handleSaveStyle = async () => {
    if (!styleForm.name.trim()) {
      setError('Style name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateBrainstormStyle(editingStyle, {
        name: styleForm.name,
        description: styleForm.description,
        initialPrompt: styleForm.initialPrompt,
        expansionPrompt: styleForm.expansionPrompt,
      });
      setSuccess('Brainstorming style updated');

      // Reload styles
      const result = await api.listBrainstormStyles();
      setStyles(result.styles || []);
      setEditingStyle(null);
      setStyleDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to save style');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelStyleEdit = () => {
    setEditingStyle(null);
    setStyleForm({
      name: '',
      description: '',
      initialPrompt: '',
      expansionPrompt: '',
    });
    setStyleDirty(false);
  };

  const handleStyleFormChange = (field) => (e) => {
    setStyleForm((prev) => ({ ...prev, [field]: e.target.value }));
    setStyleDirty(true);
  };

  const toggleStyleExpanded = (styleId) => {
    setExpandedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(styleId)) {
        next.delete(styleId);
      } else {
        next.add(styleId);
      }
      return next;
    });
  };

  return (
    <div className="settings-section sleep-compute-section">
      {/* Budget Defaults */}
      <div id="sleep-compute-defaults" className="modal-section">
        <h3>
          <Settings size={18} />
          Default Budget Settings
        </h3>
        <p className="section-description">
          Configure default values for sleep compute sessions. Users can override these when starting a session.
        </p>

        <div className="sleep-settings-grid">
          <div className="sleep-setting-row">
            <label>Default Depth</label>
            <div className="sleep-setting-input-group">
              <input
                type="range"
                min="1"
                max="3"
                step="1"
                value={defaultDepth}
                onChange={(e) => {
                  setDefaultDepth(parseInt(e.target.value));
                  setSettingsDirty(true);
                }}
                className="sleep-slider"
              />
              <span className="sleep-setting-value">{defaultDepth}</span>
            </div>
            <span className="field-hint">Graph traversal hops (1=shallow, 3=deep)</span>
          </div>

          <div className="sleep-setting-row">
            <label>Default Max Notes</label>
            <div className="sleep-setting-input-group">
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={defaultMaxNotes}
                onChange={(e) => {
                  setDefaultMaxNotes(parseInt(e.target.value));
                  setSettingsDirty(true);
                }}
                className="sleep-slider"
              />
              <span className="sleep-setting-value">{defaultMaxNotes}</span>
            </div>
            <span className="field-hint">Maximum notes to analyze per session</span>
          </div>

          <div className="sleep-setting-row">
            <label>Default Turns</label>
            <div className="sleep-setting-input-group">
              <input
                type="range"
                min="2"
                max="5"
                step="1"
                value={defaultTurns}
                onChange={(e) => {
                  setDefaultTurns(parseInt(e.target.value));
                  setSettingsDirty(true);
                }}
                className="sleep-slider"
              />
              <span className="sleep-setting-value">{defaultTurns}</span>
            </div>
            <span className="field-hint">Brainstorming iterations per session</span>
          </div>

          <div className="sleep-setting-row">
            <label>Model Override</label>
            <input
              type="text"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setSettingsDirty(true);
              }}
              placeholder="e.g., anthropic/claude-opus-4.5"
              className="sleep-model-input"
            />
            <span className="field-hint">Leave empty to use default (Claude Opus 4.5)</span>
          </div>
        </div>

        <div className="btn-group">
          <button
            className="btn-primary"
            onClick={handleSaveSettings}
            disabled={loading || !settingsDirty}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          {settingsDirty && (
            <button
              className="btn-secondary"
              onClick={handleResetSettings}
              disabled={loading}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Brainstorm Styles */}
      <div id="sleep-compute-styles" className="modal-section">
        <h3>
          <Sparkles size={18} />
          Brainstorming Styles
        </h3>
        <p className="section-description">
          Enable/disable styles and customize their prompts. Each style applies a different
          brainstorming methodology to explore your knowledge graph.
        </p>

        {stylesLoading ? (
          <div className="styles-loading">Loading styles...</div>
        ) : (
          <div className="brainstorm-styles-list">
            {styles.map((style) => {
              const isExpanded = expandedStyles.has(style.id);
              const isEditing = editingStyle === style.id;

              return (
                <div
                  key={style.id}
                  className={`brainstorm-style-block ${style.enabled === false ? 'disabled' : ''} ${isEditing ? 'editing' : ''}`}
                >
                  <div className="brainstorm-style-header">
                    <button
                      className="brainstorm-style-toggle"
                      onClick={() => handleToggleStyle(style.id, style.enabled !== false)}
                      title={style.enabled === false ? 'Enable style' : 'Disable style'}
                    >
                      {style.enabled === false ? (
                        <ToggleLeft size={20} className="toggle-off" />
                      ) : (
                        <ToggleRight size={20} className="toggle-on" />
                      )}
                    </button>

                    <div className="brainstorm-style-info">
                      <span className="brainstorm-style-name">{style.name}</span>
                      <span className="brainstorm-style-description">{style.description}</span>
                    </div>

                    <div className="brainstorm-style-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleEditStyle(style)}
                        title="Edit prompts"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => toggleStyleExpanded(style.id)}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && style.turn_pattern && (
                    <div className="brainstorm-style-details">
                      <div className="brainstorm-style-pattern">
                        <strong>Turn Pattern:</strong> {style.turn_pattern.join(' → ')}
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="brainstorm-style-editor">
                      <div className="form-row">
                        <label>Display Name</label>
                        <input
                          type="text"
                          value={styleForm.name}
                          onChange={handleStyleFormChange('name')}
                          className="style-input"
                        />
                      </div>

                      <div className="form-row">
                        <label>Description</label>
                        <input
                          type="text"
                          value={styleForm.description}
                          onChange={handleStyleFormChange('description')}
                          className="style-input"
                        />
                      </div>

                      <div className="form-row">
                        <label>Initial Prompt</label>
                        <textarea
                          value={styleForm.initialPrompt}
                          onChange={handleStyleFormChange('initialPrompt')}
                          className="style-prompt-textarea"
                          rows={10}
                          placeholder="Prompt for the first turn..."
                        />
                        <span className="field-hint">
                          Use {'{notes_content}'} to insert the collected notes
                        </span>
                      </div>

                      <div className="form-row">
                        <label>Expansion Prompt</label>
                        <textarea
                          value={styleForm.expansionPrompt}
                          onChange={handleStyleFormChange('expansionPrompt')}
                          className="style-prompt-textarea"
                          rows={10}
                          placeholder="Prompt for subsequent turns..."
                        />
                        <span className="field-hint">
                          Use {'{idea}'} for previous ideas and {'{notes_content}'} for notes
                        </span>
                      </div>

                      <div className="btn-group">
                        <button
                          className="btn-primary"
                          onClick={handleSaveStyle}
                          disabled={loading || !styleDirty}
                        >
                          {loading ? 'Saving...' : 'Save Style'}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={handleCancelStyleEdit}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
