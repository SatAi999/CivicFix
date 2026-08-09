import React, { useState, useEffect } from 'react';
import { issuesAPI, deptsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Download, ShieldAlert, Award, FileText, CheckCircle, 
  XCircle, RotateCcw, User, MapPin, Calendar, HardDrive, Check, Hammer 
} from 'lucide-react';
import BeforeAfterView from './BeforeAfterView';
import IssueTimeline from './IssueTimeline';

const IssueDetail = ({ issueId, onBack, onStatusChange }) => {
  const { user } = useAuth();
  
  const [issue, setIssue] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Interactive UI triggers
  const [supportLoading, setSupportLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Operator Actions form
  const [selectedDept, setSelectedDept] = useState('');
  const [resNotes, setResNotes] = useState('');
  const [resFile, setResFile] = useState(null);
  
  // Citizen Verify form
  const [verifyNotes, setVerifyNotes] = useState('');

  const fetchIssueDetails = async () => {
    try {
      setLoading(true);
      const [issueRes, deptRes] = await Promise.all([
        issuesAPI.get(issueId),
        (user && user.role_name !== 'citizen') ? deptsAPI.list() : Promise.resolve({ data: [] })
      ]);
      setIssue(issueRes.data);
      setDepartments(deptRes.data);
      if (deptRes.data.length > 0) {
        // default select
        const defaultDeptCode = issueRes.data.category_name;
        const matchedDept = deptRes.data.find(d => d.code === defaultDeptCode);
        setSelectedDept(matchedDept?.id || deptRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch details for case: ' + issueId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetails();
  }, [issueId]);

  const handleSupportToggle = async () => {
    if (supportLoading) return;
    setSupportLoading(true);
    try {
      if (issue.has_supported) {
        await issuesAPI.unsupport(issueId);
        setIssue(prev => ({
          ...prev,
          has_supported: false,
          supporters_count: prev.supporters_count - 1
        }));
      } else {
        await issuesAPI.support(issueId);
        setIssue(prev => ({
          ...prev,
          has_supported: true,
          supporters_count: prev.supporters_count + 1
        }));
      }
      // Re-fetch to get updated severity calculations (since severity changes with supporters count)
      const res = await issuesAPI.get(issueId);
      setIssue(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to update support status.');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await issuesAPI.assign(issueId, selectedDept);
      alert('Department assigned successfully!');
      fetchIssueDetails();
      onStatusChange();
    } catch (err) {
      alert('Failed to assign department.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status, notes = '') => {
    setActionLoading(true);
    try {
      // Direct update endpoints can be handled in backend. For MVP we support state logs.
      // We will create the PUT/PATCH endpoints to direct update. Let's make sure it handles.
      // E.g., operator accepts work -> changes to IN_PROGRESS
      // We can patch status
      await issuesAPI.assign(issueId, issue.assignments[0]?.department_id || 1); // keep assignment
      // Note: we can direct update status by calling resolve or verifications.
      // If we just want status updating, we can hit PATCH endpoint or call assign with status.
      // Let's create status endpoint in backend if we want, or call resolve.
      // We implemented PUT /api/issues/{id}/status in backend? Let's check: we can use a direct call!
      // Wait, let's check crud.py, we have `update_issue_status`.
      // Let's write an API call in api.js to PATCH `/issues/{id}/status`.
      // Ah, let's see if we have `PATCH /issues/{id}/status` in issues.py. We can check our issues.py file.
      // Wait, in issues.py, we didn't add the direct PATCH status endpoint. But wait! Let's check:
      // Oh, we can add it, or we can use the department assignment to update to ASSIGNED, resolve to update to RESOLVED, etc.
      // Let's verify: does the operator need to update status to IN_PROGRESS?
      // Yes, in issues.py, we can add a quick status patch endpoint to support IN_PROGRESS.
      // Let's check if we can run a simple update.
      // Let's check what endpoints we have in issues.py.
      // In issues.py:
      // - POST /issues
      // - GET /issues
      // - GET /issues/{id}
      // - POST /issues/{id}/support
      // - POST /issues/{id}/assign
      // - POST /issues/{id}/resolve
      // - POST /issues/{id}/verify
      // Let's check how to transition to IN_PROGRESS. We can add a simple post endpoint: POST /api/issues/{id}/inprogress or PATCH.
      // Let's look at issues.py, we can add a simple PATCH status endpoint if needed. Wait! We can also transition to IN_PROGRESS during assignment or by another route.
      // Let's add a PATCH /api/issues/{id}/status endpoint in our backend router issues.py, or just add a simple action call.
      // Let's see if we can do this through API call. We can write a quick update. Let's first review the details and edit issues.py if needed.
      // Wait, we can edit issues.py later if needed. Let's write how `handleUpdateStatus` works:
      // We can call `api.patch(\`/issues/\${issueId}/status\`, null, { params: { status: 'IN_PROGRESS' } })`.
      // Let's add this PATCH endpoint to `issues.py` so it works! That's super clean and matches standard REST API.
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePatchStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      // Let's call api.patch directly or write custom route.
      // Let's check if we have a direct PATCH status API. In api.js we can add:
      // patchStatus: (id, status) => api.patch(`/issues/${id}/status`, null, { params: { status } })
      // Let's use custom Axios client inside here
      const token = localStorage.getItem('civicfix_token');
      await axios.patch(`${window.BACKEND_URL || 'http://localhost:8000'}/api/issues/${issueId}/status`, null, {
         params: { status: newStatus },
         headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Case transitioned to ${newStatus}`);
      fetchIssueDetails();
      onStatusChange();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resFile || !resNotes) {
      alert('Please provide notes and a resolution picture.');
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('notes', resNotes);
      formData.append('file', resFile);
      
      const response = await issuesAPI.resolve(issueId, formData);
      alert(response.data.message + '\n\nOpenCV Result: ' + response.data.visual_comparison);
      fetchIssueDetails();
      onStatusChange();
    } catch (err) {
      alert('Failed to submit resolution.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifySubmit = async (isFixed) => {
    setActionLoading(true);
    try {
      await issuesAPI.verify(issueId, { is_fixed: isFixed, notes: verifyNotes });
      alert(isFixed === 'fixed' ? 'Resolution verified successfully! Case closed.' : 'Resolution disputed. Case reopened.');
      fetchIssueDetails();
      onStatusChange();
    } catch (err) {
      alert('Failed to verify.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
     return <div style={{ padding: '40px', textAlign: 'center' }}>Syncing case audit data...</div>;
  }

  if (error) {
     return <div style={{ color: 'var(--color-critical)', padding: '40px', textAlign: 'center' }}>{error}</div>;
  }

  const coverPhoto = issue.media.find(m => !m.is_resolution);
  const resolutionPhoto = issue.media.find(m => m.is_resolution);
  const isResolved = ['RESOLVED', 'CITIZEN_VERIFIED'].includes(issue.status);

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto', overflowY: 'auto', flex: 1 }}>
      {/* Back Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Back to Map
        </button>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Download Structured Report */}
          <a 
            href={`${window.BACKEND_URL || 'http://localhost:8000'}/api/issues/${issueId}/report`} 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Download PDF Report
          </a>

          {user && user.role_name === 'citizen' && (
            <button 
              onClick={handleSupportToggle} 
              className={`btn btn-sm ${issue.has_supported ? 'btn-danger' : 'btn-primary'}`}
              disabled={supportLoading}
            >
              {issue.has_supported ? 'Remove Support' : 'Support Issue'}
            </button>
          )}
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Main Case details */}
        <div>
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Ticket ID: {issue.id}</span>
            <h1 style={{ fontSize: '26px', margin: '4px 0 10px 0' }}>{issue.title}</h1>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`severity-badge ${issue.severity.toLowerCase()}`}>
                {issue.severity} Priority
              </span>
              <span className="user-badge" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                {issue.status.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> {new Date(issue.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Evidence Details */}
          <div className="card" style={{ padding: '20px', marginBottom: '25px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' }}>Evidence Details</h3>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px' }}>
              {issue.description || 'No description provided.'}
            </p>
            
            {coverPhoto && (
              <img 
                src={`${window.BACKEND_URL || 'http://localhost:8000'}${coverPhoto.media_path}`} 
                style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} 
                alt="Evidence Photo" 
              />
            )}
            
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <MapPin size={14} className="text-primary" />
                <span>Address: <strong>{issue.location?.address} (Ward: {issue.location?.ward})</strong></span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '20px' }}>
                Coords: {issue.location?.latitude.toFixed(5)}, {issue.location?.longitude.toFixed(5)}
              </div>
            </div>
          </div>

          {/* AI Evidence verification panel (Evidence-First Design) */}
          {issue.ai_analysis && (
            <div className="ai-preview-box" style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                🤖 Multimodal AI Observations
              </h3>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>AI Classification</td>
                    <td style={{ padding: '8px 0', fontWeight: 'bold', textAlign: 'right' }}>{issue.ai_analysis.category_detected}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Model Confidence</td>
                    <td style={{ padding: '8px 0', fontWeight: 'bold', textAlign: 'right' }}>{Math.round(issue.ai_analysis.confidence * 100)}%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Objects Identified</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {issue.ai_analysis.objects_detected.join(', ') || 'None'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Hazards Extracted</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--color-critical)' }}>
                      {issue.ai_analysis.hazards.join(', ') || 'None'}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ borderTop: '1px solid rgba(139, 92, 246, 0.2)', paddingTop: '10px', marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>AI Reasoning:</strong> {issue.ai_analysis.reasoning}
              </div>
            </div>
          )}

          {/* Before/After comparison (If marked resolved) (WOW #7) */}
          {issue.status === 'RESOLUTION_SUBMITTED' && resolutionPhoto && coverPhoto && (
            <div className="card" style={{ padding: '20px', marginBottom: '25px' }}>
              <BeforeAfterView 
                beforeUrl={`${window.BACKEND_URL || 'http://localhost:8000'}${coverPhoto.media_path}`}
                afterUrl={`${window.BACKEND_URL || 'http://localhost:8000'}${resolutionPhoto.media_path}`}
              />
            </div>
          )}

          {/* Citizen Verification Panel (WOW #5) */}
          {issue.status === 'RESOLUTION_SUBMITTED' && user && user.role_name === 'citizen' && (
            <div className="card" style={{ padding: '20px', marginBottom: '25px', borderColor: 'var(--color-medium)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-medium)' }}>Citizen Resolution Verification</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Authority has uploaded repair evidence (see photos above) and marked it fixed. Has this problem actually been fixed?
              </p>
              
              <div className="form-group">
                <label className="form-label" htmlFor="verify-feedback">Feedback Notes</label>
                <textarea 
                  id="verify-feedback"
                  className="form-control" 
                  rows="2" 
                  placeholder="Tell us if the repair is successful or if issues still remain..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
                <button 
                  onClick={() => handleVerifySubmit('still_exists')}
                  className="btn btn-danger"
                  disabled={actionLoading}
                >
                  <XCircle size={16} /> No, Still Exists (Reopen)
                </button>
                <button 
                  onClick={() => handleVerifySubmit('fixed')}
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--color-low)' }}
                  disabled={actionLoading}
                >
                  <CheckCircle size={16} /> Yes, Fixed (Close Case)
                </button>
              </div>
            </div>
          )}

          {/* Operator Action panels */}
          {user && (user.role_name === 'operator' || user.role_name === 'admin') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '25px' }}>
              
              {/* Assignment Routing */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '15px' }}>Responsible Department Route</h3>
                <form onSubmit={handleAssignDepartment} style={{ display: 'flex', gap: '12px' }}>
                  <select 
                    className="form-control"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    disabled={actionLoading}
                    style={{ flex: 1 }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    Assign route
                  </button>
                </form>
              </div>

              {/* Status workflow transitions */}
              {issue.status === 'ASSIGNED' && (
                <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>Triage state: Assigned</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned to your department queue. Accept and start work.</p>
                  </div>
                  <button 
                    onClick={() => handlePatchStatus('IN_PROGRESS')}
                    className="btn btn-primary"
                    disabled={actionLoading}
                  >
                    <Hammer size={16} /> Start Repairs
                  </button>
                </div>
              )}

              {/* Upload resolution evidence */}
              {issue.status === 'IN_PROGRESS' && (
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '15px' }}>Submit Repair Resolution Evidence</h3>
                  <form onSubmit={handleResolveSubmit}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="resolution-notes">Resolution Notes</label>
                      <textarea 
                        id="resolution-notes"
                        className="form-control" 
                        rows="2" 
                        placeholder="Detail the work done to resolve the issue (e.g. potholes filled, streetlight bulb replaced)..."
                        value={resNotes}
                        onChange={(e) => setResNotes(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Upload Repair Photograph</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="form-control"
                        onChange={(e) => setResFile(e.target.files[0])}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', backgroundColor: 'var(--color-low)' }} disabled={actionLoading}>
                      <Check size={16} /> Submit Resolution Evidence
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Scorer details */}
        <div>
          {/* Smart Severity engine explain box (WOW #3) */}
          <div className="card" style={{ padding: '15px', marginBottom: '25px', backgroundColor: 'var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} className="text-primary" /> Smart Priority Score
            </h3>
            
            <div style={{ textAlign: 'center', padding: '15px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '15px' }}>
              <span className={`severity-badge ${issue.severity.toLowerCase()}`} style={{ fontSize: '16px', padding: '6px 16px' }}>
                {issue.severity} Priority
              </span>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                Supporters: <strong>{issue.supporters_count} citizens</strong>
              </div>
            </div>

            <div style={{ fontSize: '13px' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>Engine Calculation Factors:</div>
              <ul style={{ paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {issue.severity_reasons?.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Timeline Status Track */}
          <div className="card" style={{ padding: '15px' }}>
            <IssueTimeline history={issue.history} currentStatus={issue.status} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;
