import React from 'react';
import { Check, ClipboardList, Send, Hammer, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';

const IssueTimeline = ({ history, currentStatus }) => {
  
  // Icon selector based on status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'REPORTED':
        return <ClipboardList size={16} />;
      case 'AI_VERIFIED':
        return <Send size={16} style={{ color: 'var(--accent-secondary)' }} />;
      case 'TRIAGED':
        return <UserCheck size={16} />;
      case 'ASSIGNED':
        return <UserCheck size={16} />;
      case 'IN_PROGRESS':
        return <Hammer size={16} />;
      case 'RESOLUTION_SUBMITTED':
        return <CheckCircle2 size={16} style={{ color: 'var(--color-medium)' }} />;
      case 'RESOLVED':
      case 'CITIZEN_VERIFIED':
        return <Check size={16} style={{ color: 'var(--color-low)' }} />;
      case 'REOPENED':
        return <AlertTriangle size={16} style={{ color: 'var(--color-critical)' }} />;
      default:
        return <ClipboardList size={16} />;
    }
  };

  const getStatusLabel = (status) => {
     return status.replace('_', ' ');
  };

  // Sort history chronologically (oldest first for bottom-to-top, or newest first for top-to-bottom)
  // Let's list newest at the top
  const sortedHistory = [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{ padding: '10px 0' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '20px' }}>Resolution Track Timeline</h3>
      
      <div className="timeline">
        <div className="timeline-line" />
        
        {sortedHistory.map((item, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={idx} className={`timeline-node ${isLatest ? 'active' : ''}`}>
              <div className="timeline-bullet" style={{
                borderColor: isLatest ? 'var(--accent-primary)' : 'var(--border-color)',
                backgroundColor: isLatest ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: isLatest ? 'white' : 'var(--text-secondary)'
              }}>
                {getStatusIcon(item.status)}
              </div>
              
              <div className="timeline-body" style={{
                borderColor: isLatest ? 'rgba(37, 99, 235, 0.4)' : 'var(--border-color)',
                boxShadow: isLatest ? '0 4px 12px rgba(37, 99, 235, 0.05)' : 'none'
              }}>
                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', textTransform: 'uppercase', color: isLatest ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {getStatusLabel(item.status)}
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    by {item.changed_by_username}
                  </span>
                </div>
                
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  {item.notes}
                </p>
                
                <div className="timeline-time">
                  {new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IssueTimeline;
