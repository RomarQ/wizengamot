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
    <div className={`sleep-compute-status ${status.running ? 'running' : 'done'}`}>
      <div className="sleep-status-header">
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

      {/* Turn history */}
      {session?.turns?.length > 0 && (
        <div className="sleep-turn-history">
          <div className="sleep-turn-history-label">Turn History</div>
          <div className="sleep-turn-list">
            {session.turns.map((turn, idx) => (
              <div key={idx} className="sleep-turn-item">
                <div className="sleep-turn-number">Turn {turn.turn_number}</div>
                <div className="sleep-turn-ideas">
                  {turn.ideas?.length || 0} ideas
                </div>
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
