import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MapViewer from './components/MapViewer';
import ReportForm from './components/ReportForm';
import IssueDetail from './components/IssueDetail';
import DashboardStats from './components/DashboardStats';
import ChatAssistant from './components/ChatAssistant';
import LostFoundView from './components/LostFoundView';
import { issuesAPI, deptsAPI, authAPI } from './services/api';
import { Camera, Map, BarChart2, ShieldAlert, Zap, Compass, CheckCircle2, ChevronRight, User, AlertCircle, X, Loader } from 'lucide-react';
import axios from 'axios';

const AppContent = () => {
  const { user, login, signup, logout } = useAuth();
  
  // View states: 'landing' | 'map' | 'my-reports' | 'dashboard' | 'detail'
  const [activeView, setActiveView] = useState('landing');
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  
  // Modals / Overlays
  const [showReportForm, setShowReportForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  
  // Data Registry
  const [issues, setIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [appStats, setAppStats] = useState({ total_open: 247, critical: 12, resolved: 1284 });
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authRole, setAuthRole] = useState('citizen');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Demo simulator states
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  // Fetch initial maps data
  const loadRegistryData = async () => {
    try {
      const [issuesRes, categoriesRes] = await Promise.all([
        issuesAPI.list(),
        deptsAPI.categories()
      ]);
      setIssues(issuesRes.data);
      setCategories(categoriesRes.data);
      
      // Compute simple stats for landing page
      const open = issuesRes.data.filter(i => !['RESOLVED', 'CITIZEN_VERIFIED'].includes(i.status)).length;
      const crit = issuesRes.data.filter(i => i.severity === 'CRITICAL' && !['RESOLVED', 'CITIZEN_VERIFIED'].includes(i.status)).length;
      const res = issuesRes.data.filter(i => ['RESOLVED', 'CITIZEN_VERIFIED'].includes(i.status)).length;
      setAppStats({ total_open: open || 6, critical: crit || 1, resolved: res || 2 });
    } catch (err) {
      console.warn('Backend offline, using seed simulation defaults');
    }
  };

  useEffect(() => {
    loadRegistryData();
  }, [user]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    if (authTab === 'login') {
      const res = await login(username, password);
      if (res.success) {
        setShowAuthModal(false);
        setUsername('');
        setPassword('');
        setActiveView('map');
      } else {
        setAuthError(res.error);
      }
    } else {
      const res = await signup(username, email, password, authRole);
      if (res.success) {
        alert('Account registered! Please log in.');
        setAuthTab('login');
      } else {
        setAuthError(res.error);
      }
    }
    setAuthLoading(false);
  };

  const handleViewDetails = (issueId) => {
    setSelectedIssueId(issueId);
    setActiveView('detail');
  };

  const triggerAuthOrForm = () => {
    if (!user) {
      setAuthTab('login');
      setShowAuthModal(true);
    } else {
      setShowReportForm(true);
    }
  };

  // --- WOW DEMO SCENARIO WIZARD SYSTEM ---
  const runDemoStep = async (stepNum) => {
    setDemoStep(stepNum);
    
    if (stepNum === 1) {
      // Step 1: Log in citizen, open report form, pre-populate pothole info
      setLoadingDemo(true);
      logout(); // clear current
      const res = await login('citizen', 'password123');
      if (res.success) {
        setActiveView('map');
        setShowReportForm(true);
        // Pre-fill demo info (we simulate this in reporting view)
        setTimeout(() => {
          const titleInput = document.getElementById('report-title');
          const descInput = document.getElementById('report-desc');
          if (titleInput) titleInput.value = "Deep pothole next to school entrance";
          if (descInput) descInput.value = "A very deep pothole right in front of Sunrise Public School. Cars are swerving to avoid it.";
        }, 100);
      }
      setLoadingDemo(false);
    } 
    else if (stepNum === 2) {
      // Step 2: Simulate Duplicate Search trigger.
      // We will show duplicate checker suggestions. In ReportForm, user clicks Support.
      // We'll direct them to support CIV-28491.
      // Let's close form and navigate directly to CIV-28491 details to show the supported count.
      setLoadingDemo(true);
      setShowReportForm(false);
      
      // Let's call support API for CIV-28491 as citizen
      try {
        await issuesAPI.support('CIV-28491');
      } catch (err) {}
      
      handleViewDetails('CIV-28491');
      setLoadingDemo(false);
    } 
    else if (stepNum === 3) {
      // Step 3: Login as Operator, open Operator Dashboard
      setLoadingDemo(true);
      logout();
      const res = await login('operator', 'password123');
      if (res.success) {
        setActiveView('dashboard');
      }
      setLoadingDemo(false);
    } 
    else if (stepNum === 4) {
      // Step 4: Operator views CIV-28491 detail card. We open it.
      setActiveView('detail');
      handleViewDetails('CIV-28491');
    }
    else if (stepNum === 5) {
      // Step 5: Transition CIV-28491 to IN_PROGRESS. We can trigger status update
      setLoadingDemo(true);
      try {
        const token = localStorage.getItem('civicfix_token');
        await axios.patch(`${window.BACKEND_URL || 'http://localhost:8000'}/api/issues/CIV-28491/status`, null, {
           params: { status: 'IN_PROGRESS' },
           headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {}
      
      // Refresh details
      handleViewDetails('CIV-28491');
      setLoadingDemo(false);
    }
    else if (stepNum === 6) {
      // Step 6: Operator uploads after-repair image to mark RESOLVED.
      // Since file uploads can't be easily simulated without forms, we'll hit resolution endpoint
      // using a seeded mockup image file on disk in backend. 
      // The backend resolve API will look for the image. The demo image is pre-copied during startup!
      setLoadingDemo(true);
      try {
        const token = localStorage.getItem('civicfix_token');
        const formData = new FormData();
        formData.append('notes', 'Asphalt filled and rolled flat. Hazard cleared.');
        // We will create a blob placeholder so the multipart doesn't fail
        const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
        formData.append('file', blob, 'after.png');
        
        await axios.post(`${window.BACKEND_URL || 'http://localhost:8000'}/api/issues/CIV-28491/resolve`, formData, {
           headers: { 
             Authorization: `Bearer ${token}`,
             'Content-Type': 'multipart/form-data'
           }
        });
      } catch (err) {}
      
      handleViewDetails('CIV-28491');
      setLoadingDemo(false);
    }
    else if (stepNum === 7) {
      // Step 7: Citizen logs back in, views CIV-28491 details, and verifies fixed
      setLoadingDemo(true);
      logout();
      const res = await login('citizen', 'password123');
      if (res.success) {
        setActiveView('detail');
        handleViewDetails('CIV-28491');
      }
      setLoadingDemo(false);
    }
    else if (stepNum === 8) {
      // Step 8: Citizen verifies fix -> closed.
      setLoadingDemo(true);
      try {
        const token = localStorage.getItem('civicfix_token');
        await axios.post(`${window.BACKEND_URL || 'http://localhost:8000'}/api/issues/CIV-28491/verify`, {
          is_fixed: 'fixed',
          notes: 'Confirmed fixed! The road is smooth now. Great job.'
        }, {
           headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {}
      
      handleViewDetails('CIV-28491');
      setLoadingDemo(false);
    }
  };

  const [loadingDemo, setLoadingDemo] = useState(false);

  return (
    <div className="app-container">
      <Navbar activeView={activeView} setActiveView={setActiveView} onShowAuth={(tab) => { setAuthTab(tab); setShowAuthModal(true); }} />



      <main className="main-content">
        {/* VIEW 1: LANDING PAGE */}
        {activeView === 'landing' && (
          <div>
            <section className="hero-section">
              <div className="container">
                <span className="user-badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'hsl(263, 70%, 75%)', padding: '6px 16px', fontSize: '13px', marginBottom: '15px' }}>
                  🤖 AI-POWERED CIVIC RESOLUTION PLATFORM
                </span>
                <h1 className="hero-title">
                  See a problem.<br /><span>Fix it faster.</span>
                </h1>
                <p className="hero-subtitle">
                  CivicFix converts raw real-world observations (potholes, garbage, broken lighting) into verified, prioritized, and trackable civic actions.
                </p>
                <div className="hero-ctas">
                  <button onClick={triggerAuthOrForm} className="btn btn-primary">
                    Report a Civic Problem
                  </button>
                  <button onClick={() => setActiveView('map')} className="btn btn-secondary">
                    Explore Active Issues
                  </button>
                </div>

                <div className="workflow-container">
                  <div className="workflow-step">Capture Image/Video</div>
                  <div className="workflow-arrow"><ChevronRight /></div>
                  <div className="workflow-step">AI Multimodal Triage</div>
                  <div className="workflow-arrow"><ChevronRight /></div>
                  <div className="workflow-step">De-duplicate Check</div>
                  <div className="workflow-arrow"><ChevronRight /></div>
                  <div className="workflow-step">Auto Dept Route</div>
                  <div className="workflow-arrow"><ChevronRight /></div>
                  <div className="workflow-step">Citizen Closed Loop</div>
                </div>

                <div className="stats-banner">
                  <div className="stat-box">
                    <div className="stat-val">{appStats.total_open}</div>
                    <div className="stat-lbl">Active Incidents</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-val" style={{ color: 'var(--color-critical)' }}>{appStats.critical}</div>
                    <div className="stat-lbl">Critical / Danger Points</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-val" style={{ color: 'var(--color-low)' }}>{appStats.resolved}</div>
                    <div className="stat-lbl">Incidents Resolved</div>
                  </div>
                </div>

                {/* Quick Demo Role Selector Card */}
                <div className="card card-glass" style={{ maxWidth: '720px', margin: '60px auto 0 auto', padding: '30px', textAlign: 'center', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Zap size={18} className="text-primary" style={{ color: 'var(--accent-secondary)' }} />
                    Interactive Sandbox Environment
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                    Select a profile to instantly access the platform with predefined permissions and seeded data:
                  </p>
                  
                  <div className="grid-3" style={{ gap: '15px' }}>
                    <button 
                      onClick={async () => {
                        logout();
                        const r = await login('citizen', 'password123');
                        if (r.success) {
                          setActiveView('map');
                        } else {
                          alert('Error logging in citizen: ' + r.error);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ flexDirection: 'column', padding: '20px 10px', height: 'auto', gap: '6px' }}
                    >
                      <User size={24} style={{ color: 'var(--accent-primary)' }} />
                      <strong style={{ fontSize: '14px' }}>Citizen</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Report & track issues</span>
                    </button>
                    
                    <button 
                      onClick={async () => {
                        logout();
                        const r = await login('operator', 'password123');
                        if (r.success) {
                          setActiveView('dashboard');
                        } else {
                          alert('Error logging in operator: ' + r.error);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ flexDirection: 'column', padding: '20px 10px', height: 'auto', gap: '6px' }}
                    >
                      <User size={24} style={{ color: 'var(--color-medium)' }} />
                      <strong style={{ fontSize: '14px' }}>Authority Operator</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assign & resolve cases</span>
                    </button>
                    
                    <button 
                      onClick={async () => {
                        logout();
                        const r = await login('admin', 'password123');
                        if (r.success) {
                          setActiveView('map');
                        } else {
                          alert('Error logging in admin: ' + r.error);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ flexDirection: 'column', padding: '20px 10px', height: 'auto', gap: '6px' }}
                    >
                      <User size={24} style={{ color: 'var(--color-critical)' }} />
                      <strong style={{ fontSize: '14px' }}>Platform Admin</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Full system access</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: MAP VIEWER */}
        {activeView === 'map' && (
          <MapViewer 
            issues={issues}
            categories={categories}
            onViewDetails={handleViewDetails}
            onReportNew={triggerAuthOrForm}
          />
        )}

        {/* VIEW 3: CITIZEN REPORT HISTORY */}
        {activeView === 'my-reports' && user && (
          <div className="container" style={{ padding: '40px 20px' }}>
            <h1 style={{ fontSize: '26px', marginBottom: '8px' }}>My Submitted Reports</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Track the lifecycle and verification logs of your reported problems.</p>
            
            {issues.filter(i => i.reporter_username === user.username).length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                You have not filed any reports yet. Tap 'Report a Civic Problem' to make your first report.
              </div>
            ) : (
              <div className="grid-3">
                {issues.filter(i => i.reporter_username === user.username).map((issue) => (
                  <div key={issue.id} className="card severity-card" style={{ cursor: 'pointer' }} onClick={() => handleViewDetails(issue.id)}>
                    <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{issue.id}</span>
                      <span className={`severity-badge ${issue.severity.toLowerCase()}`} style={{ fontSize: '10px' }}>{issue.severity}</span>
                    </div>
                    <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>{issue.title}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginBottom: '12px' }}>
                      {issue.description}
                    </p>
                    <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{issue.category_name}</span>
                      <span><strong>{issue.status}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: INTELLIGENCE HEALTH DASHBOARD */}
        {activeView === 'dashboard' && (
          <DashboardStats />
        )}

        {/* VIEW 4.5: LOST & FOUND BULLETIN BOARD */}
        {activeView === 'lost-found' && (
          <LostFoundView 
            issues={issues}
            onReportNew={triggerAuthOrForm}
            onViewDetails={handleViewDetails}
          />
        )}

        {/* VIEW 5: DETAIL AUDIT CARD */}
        {activeView === 'detail' && selectedIssueId && (
          <IssueDetail 
            issueId={selectedIssueId} 
            onBack={() => setActiveView('map')} 
            onStatusChange={loadRegistryData}
          />
        )}
      </main>

      {/* Camera/Report Form wizard Modal */}
      {showReportForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2500,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <ReportForm 
            onCancel={() => setShowReportForm(false)} 
            onSuccess={(newId) => {
              setShowReportForm(false);
              loadRegistryData();
              handleViewDetails(newId);
            }} 
          />
        </div>
      )}

      {/* Auth Login/Signup Modal */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2500,
          padding: '20px'
        }}>
          <div className="card card-glass" style={{ width: '100%', maxWidth: '420px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button 
                  onClick={() => { setAuthTab('login'); setUsername(''); setEmail(''); setPassword(''); setAuthError(''); }} 
                  style={{ background: 'none', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', color: authTab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Log In
                </button>
                <button 
                  onClick={() => { setAuthTab('signup'); setUsername(''); setEmail(''); setPassword(''); setAuthError(''); }} 
                  style={{ background: 'none', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', color: authTab === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Sign Up
                </button>
              </div>
              <button onClick={() => { setShowAuthModal(false); setUsername(''); setEmail(''); setPassword(''); setAuthError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {authError && (
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-critical)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px' }}>
                <AlertCircle size={14} /> {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="E.g. citizen123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {authTab === 'signup' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="E.g. citizen@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {authTab === 'signup' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">System Role Access</label>
                  <select 
                    className="form-control"
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value)}
                  >
                    <option value="citizen">Citizen Account</option>
                    <option value="operator">Authority Operator Account</option>
                    <option value="admin">Platform Admin Account</option>
                  </select>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={authLoading}>
                {authLoading ? 'Verifying credentials...' : authTab === 'login' ? 'Access Registry Account' : 'Register Account'}
              </button>
            </form>
            
            <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
                OR QUICK DEMO ONE-CLICK LOGIN:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '10px', padding: '6px' }}
                  onClick={async () => {
                    const r = await login('citizen', 'password123');
                    if (r.success) { 
                      setShowAuthModal(false); 
                      setActiveView('map'); 
                    }
                  }}
                >
                  Citizen
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '10px', padding: '6px' }}
                  onClick={async () => {
                    const r = await login('operator', 'password123');
                    if (r.success) { 
                      setShowAuthModal(false); 
                      setActiveView('dashboard'); 
                    }
                  }}
                >
                  Operator
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '10px', padding: '6px' }}
                  onClick={async () => {
                    const r = await login('admin', 'password123');
                    if (r.success) { 
                      setShowAuthModal(false); 
                      setActiveView('map'); 
                    }
                  }}
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating chatbot assistant widget (Ground truth database linked queries) */}
      {user && (
        <ChatAssistant onViewIssue={handleViewDetails} />
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
