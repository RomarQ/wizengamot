import React, { useEffect } from 'react';
import MonitorCard from './MonitorCard';
import './MonitorInterface.css';

/**
 * MonitorInterface - Container for the Group Tracker
 * Simplified to just render MonitorCard directly (no chat toggle)
 */
export default function MonitorInterface({
  monitor,
  onMonitorUpdate,
  onMarkRead,
}) {
  // Mark as read when viewing
  useEffect(() => {
    if (monitor?.unread_updates > 0 && onMarkRead) {
      onMarkRead(monitor.id);
    }
  }, [monitor?.id, monitor?.unread_updates, onMarkRead]);

  return (
    <div className="monitor-interface">
      <MonitorCard monitor={monitor} onMonitorUpdate={onMonitorUpdate} />
    </div>
  );
}
