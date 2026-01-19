import React from 'react';
import { Layers, FileText, RefreshCw } from 'lucide-react';
import './BudgetControls.css';

/**
 * BudgetControls - Sliders for depth, max notes, and turns
 */
export default function BudgetControls({
  depth,
  maxNotes,
  turns,
  onDepthChange,
  onMaxNotesChange,
  onTurnsChange,
  disabled = false,
}) {
  return (
    <div className="budget-controls">
      <div className="budget-controls-label">Budget Parameters</div>

      <div className="budget-control-row">
        <div className="budget-control-header">
          <Layers size={14} />
          <span>Depth</span>
          <span className="budget-control-value">{depth}</span>
        </div>
        <input
          type="range"
          min="1"
          max="3"
          step="1"
          value={depth}
          onChange={(e) => onDepthChange(parseInt(e.target.value))}
          disabled={disabled}
          className="budget-slider"
        />
        <div className="budget-slider-labels">
          <span>Shallow</span>
          <span>Deep</span>
        </div>
        <div className="budget-control-hint">
          Graph traversal hops. Higher = more connections explored.
        </div>
      </div>

      <div className="budget-control-row">
        <div className="budget-control-header">
          <FileText size={14} />
          <span>Max Notes</span>
          <span className="budget-control-value">{maxNotes}</span>
        </div>
        <input
          type="range"
          min="10"
          max="50"
          step="5"
          value={maxNotes}
          onChange={(e) => onMaxNotesChange(parseInt(e.target.value))}
          disabled={disabled}
          className="budget-slider"
        />
        <div className="budget-slider-labels">
          <span>10</span>
          <span>50</span>
        </div>
        <div className="budget-control-hint">
          Maximum notes to analyze. More notes = broader context.
        </div>
      </div>

      <div className="budget-control-row">
        <div className="budget-control-header">
          <RefreshCw size={14} />
          <span>Turns</span>
          <span className="budget-control-value">{turns}</span>
        </div>
        <input
          type="range"
          min="2"
          max="5"
          step="1"
          value={turns}
          onChange={(e) => onTurnsChange(parseInt(e.target.value))}
          disabled={disabled}
          className="budget-slider"
        />
        <div className="budget-slider-labels">
          <span>2</span>
          <span>5</span>
        </div>
        <div className="budget-control-hint">
          Brainstorming iterations. More turns = deeper exploration.
        </div>
      </div>
    </div>
  );
}
