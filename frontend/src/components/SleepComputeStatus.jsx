import React, { useState, useEffect, useCallback } from 'react';
import {
  Moon,
  Play,
  Pause,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api';
import './SleepComputeStatus.css';

/**
 * SleepComputeStatus - Progress indicator with turn tracking
 */
export default function SleepComputeStatus({
  sessionId,
  onComplete,
  onCancel,
}) {
  const [status, setStatus] = useState(null);
  const [session, setSession] = useState(null);
  const [polling, setPolling] = useState(true);
  const [expandedTurns, setExpandedTurns] = useState({});
  const [expanded, setExpanded] = useState(false);

  const toggleTurn = (turnNumber) => {
    setExpandedTurns(prev => ({
      ...prev,
      [turnNumber]: !prev[turnNumber]
    }));
  };

  // Poll for status updates
  useEffect(() => {
    if (!polling) return;

    const pollStatus = async () => {
      try {
        const statusResult = await api.getSleepComputeStatus();
        setStatus(statusResult);

        // If we have a session ID, get full session data
        if (statusResult.session_id) {
          const sessionResult = await api.getSleepComputeSession(statusResult.session_id);
          setSession(sessionResult);
        }

        // Stop polling when done
        if (!statusResult.running && statusResult.session_id === sessionId) {
          setPolling(false);
          if (onComplete) {
            onComplete(statusResult);
          }
        }
      } catch (err) {
        console.error('Failed to get sleep compute status:', err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [polling, sessionId, onComplete]);

  const handlePause = useCallback(async () => {
    try {
      await api.pauseSleepCompute();
    } catch (err) {
      console.error('Failed to pause:', err);
    }
  }, []);

  const handleResume = useCallback(async () => {
    try {
      await api.resumeSleepCompute();
    } catch (err) {
      console.error('Failed to resume:', err);
    }
  }, []);

  const handleCancel = useCallback(async () => {
    try {
      await api.cancelSleepCompute();
      setPolling(false);
      if (onCancel) {
        onCancel();
      }
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  }, [onCancel]);

  if (!status) {
    return (
      <div className="sleep-compute-status loading">
        <Loader size={20} className="spinner" />
        <span>Loading status...</span>
      </div>
    );
  }

  const getPhaseLabel = (phase) => {
    switch (phase) {
      case 'collecting':
        return 'Collecting notes from knowledge graph...';
      case 'brainstorming':
        return `Brainstorming (Turn ${status.current_turn}/${status.total_turns})`;
      case 'synthesizing':
        return 'Synthesizing bridge suggestions...';
      default:
        return 'Processing...';
    }
  };

  const getStatusIcon = () => {
    if (status.cancelled) {
      return <AlertCircle size={20} className="status-icon cancelled" />;
    }
    if (status.error) {
      return <AlertCircle size={20} className="status-icon error" />;
    }
    if (!status.running) {
      return <CheckCircle size={20} className="status-icon completed" />;
    }
    if (status.paused) {
      return <Pause size={20} className="status-icon paused" />;
    }
    return <Moon size={20} className="status-icon running" />;
  };

  const formatCost = (cost) => {
    if (!cost) return '$0.00';
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div className={`sleep-compute-status ${status.running ? 'running' : 'done'} ${expanded ? 'expanded' : ''}`}>
      <div
        className={`sleep-status-header ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="sleep-status-header-left">
          {getStatusIcon()}
          <div className="sleep-status-title">
            {status.running
              ? status.paused
                ? 'Sleep Time Compute Paused'
                : 'Sleep Time Compute Running'
              : status.cancelled
                ? 'Sleep Time Compute Cancelled'
                : status.error
                  ? 'Sleep Time Compute Failed'
                  : 'Sleep Time Compute Complete'
            }
          </div>
        </div>
        <ChevronRight
          size={16}
          className={`sleep-status-chevron ${expanded ? 'expanded' : ''}`}
        />
      </div>

      {status.running && (
        <>
          <div className="sleep-status-phase">
            {getPhaseLabel(status.phase)}
          </div>

          <div className="sleep-status-progress">
            <div
              className="sleep-status-progress-bar"
              style={{ width: `${status.progress || 0}%` }}
            />
          </div>

          <div className="sleep-status-meta">
            <div className="sleep-status-meta-item">
              <Clock size={12} />
              <span>Started {formatRelativeTime(status.started_at)}</span>
            </div>
            {session?.total_cost > 0 && (
              <div className="sleep-status-meta-item">
                <DollarSign size={12} />
                <span>{formatCost(session.total_cost)}</span>
              </div>
            )}
          </div>

          <div className="sleep-status-actions">
            {status.paused ? (
              <button
                className="kg-btn kg-btn-primary"
                onClick={handleResume}
              >
                <Play size={14} />
                Resume
              </button>
            ) : (
              <button
                className="kg-btn kg-btn-secondary"
                onClick={handlePause}
              >
                <Pause size={14} />
                Pause
              </button>
            )}
            <button
              className="kg-btn kg-btn-danger"
              onClick={handleCancel}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </>
      )}

      {!status.running && session && (
        <div className="sleep-status-summary">
          {session.final_output && (
            <>
              <div className="sleep-summary-item">
                <span className="sleep-summary-label">Notes Analyzed</span>
                <span className="sleep-summary-value">
                  {session.final_output.notes_analyzed || 0}
                </span>
              </div>
              <div className="sleep-summary-item">
                <span className="sleep-summary-label">Turns Completed</span>
                <span className="sleep-summary-value">
                  {session.turns?.length || 0}
                </span>
              </div>
              <div className="sleep-summary-item">
                <span className="sleep-summary-label">Suggestions</span>
                <span className="sleep-summary-value">
                  {session.final_output.bridge_suggestions?.length || 0}
                </span>
              </div>
              {session.total_cost > 0 && (
                <div className="sleep-summary-item">
                  <span className="sleep-summary-label">Total Cost</span>
                  <span className="sleep-summary-value">
                    {formatCost(session.total_cost)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {status.error && (
        <div className="sleep-status-error">
          {status.error}
        </div>
      )}

      {/* Expanded detail section */}
      {expanded && session && (
        <div className="sleep-detail-section">
          {/* Entry points */}
          {session.config?.entry_points?.length > 0 && (
            <div className="sleep-detail-group">
              <div className="sleep-detail-label">Entry Points</div>
              <div className="sleep-detail-items">
                {session.config.entry_points.map((ep, i) => (
                  <div key={i} className="sleep-detail-item">
                    {ep.title || ep.name || ep.id || `Entry ${i + 1}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current activity when running */}
          {status.running && (
            <div className="sleep-detail-group">
              <div className="sleep-detail-label">Current Activity</div>
              <div className="sleep-detail-activity">
                {status.phase === 'collecting' && 'Searching knowledge graph for relevant notes...'}
                {status.phase === 'brainstorming' && `Generating ideas (Turn ${status.current_turn}/${status.total_turns})...`}
                {status.phase === 'synthesizing' && 'Creating bridge note suggestions...'}
                {!['collecting', 'brainstorming', 'synthesizing'].includes(status.phase) && 'Processing...'}
              </div>
            </div>
          )}

          {/* Brainstorm style if available */}
          {session.config?.style_id && (
            <div className="sleep-detail-group">
              <div className="sleep-detail-label">Brainstorm Style</div>
              <div className="sleep-detail-item">{session.config.style_id.replace(/_/g, ' ')}</div>
            </div>
          )}
        </div>
      )}

      {/* Turn history */}
      {expanded && session?.turns?.length > 0 && (
        <div className="sleep-turn-history">
          <div className="sleep-turn-history-label">Turn History</div>
          <div className="sleep-turn-list">
            {session.turns.map((turn, idx) => (
              <div key={idx} className="sleep-turn-item">
                <div
                  className="sleep-turn-header"
                  onClick={() => toggleTurn(turn.turn_number)}
                >
                  <div className="sleep-turn-info">
                    <span className="sleep-turn-number">Turn {turn.turn_number}</span>
                    <span className="sleep-turn-ideas-count">
                      {turn.ideas?.length || 0} ideas
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`sleep-turn-chevron ${expandedTurns[turn.turn_number] ? 'expanded' : ''}`}
                  />
                </div>
                {expandedTurns[turn.turn_number] && turn.ideas?.length > 0 && (
                  <div className="sleep-turn-ideas-list">
                    {turn.ideas.map((idea, i) => (
                      <div key={i} className="sleep-idea-item">
                        <div className="sleep-idea-title">{idea.title || idea.name || `Idea ${i + 1}`}</div>
                        {idea.reasoning && (
                          <div className="sleep-idea-reasoning">{idea.reasoning}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {turn.error && (
                  <div className="sleep-turn-error">{turn.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${diffHours}h ago`;
}
