import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Map, BarChart2, LogOut, User, Menu, X, CheckSquare, ShieldCheck, LogIn, Tag } from 'lucide-react';
import { notificationAPI } from '../services/api';

const Navbar = ({ activeView, setActiveView, onShowAuth }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const notifRef = useRef(null);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (user) {
      try {
        const response = await notificationAPI.list(true); // unread
        setNotifications(response.data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markRead();
      setNotifications([]);
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const handleLinkClick = (view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <a href="/" className="nav-brand" onClick={(e) => { e.preventDefault(); handleLinkClick('landing'); }}>
          <span>Civic</span>Fix
        </a>

        {/* Navigation Links - Always visible to allow smooth navigation */}
        <div className="nav-links">
          <a 
            href="#map" 
            className={`nav-link ${activeView === 'map' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleLinkClick('map'); }}
          >
            <Map size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Civic Map
          </a>

          <a 
            href="#dashboard" 
            className={`nav-link ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleLinkClick('dashboard'); }}
          >
            <BarChart2 size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Dashboard
          </a>

          <a 
            href="#lost-found" 
            className={`nav-link ${activeView === 'lost-found' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleLinkClick('lost-found'); }}
          >
            <Tag size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Lost & Found
          </a>

          {user && user.role_name === 'citizen' && (
            <a 
              href="#my-reports" 
              className={`nav-link ${activeView === 'my-reports' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); handleLinkClick('my-reports'); }}
            >
              <CheckSquare size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              My Reports
            </a>
          )}

          {user ? (
            <div className="nav-user">
              <span className={`user-badge ${user.role_name}`}>{user.role_name}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{user.username}</span>
              
              {/* Notification Bell Icon */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', position: 'relative', padding: '4px' }}
                >
                  <Bell size={18} className={notifications.length > 0 ? 'bell-anim' : ''} style={{ color: 'var(--text-secondary)' }} />
                  {notifications.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      background: 'var(--color-critical)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)'
                    }}>
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '35px',
                    width: '320px',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1100,
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Unread Alerts ({notifications.length})</span>
                      {notifications.length > 0 && (
                        <button 
                          onClick={markAllAsRead} 
                          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} style={{
                          padding: '10px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          fontSize: '12.5px'
                        }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>{n.message}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={logout} 
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', height: '32px' }}
                title="Logout"
              >
                <LogOut size={13} style={{ marginRight: '4px' }} /> Log out
              </button>
            </div>
          ) : (
            <div className="nav-user" style={{ borderLeft: 'none', paddingLeft: 0 }}>
              <button 
                onClick={() => onShowAuth('login')} 
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', height: '32px' }}
              >
                <LogIn size={13} style={{ marginRight: '4px' }} /> Sign in
              </button>
              <button 
                onClick={() => onShowAuth('signup')} 
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', height: '32px' }}
              >
                Register
              </button>
            </div>
          )}
        </div>
        
        {/* Mobile Navigation Toggle */}
        <button 
          className="btn btn-secondary" 
          style={{ display: 'none', padding: '8px' }} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 999
        }}>
          <a href="#map" className="nav-link" onClick={() => handleLinkClick('map')}>Civic Map</a>
          <a href="#dashboard" className="nav-link" onClick={() => handleLinkClick('dashboard')}>Dashboard</a>
          <a href="#lost-found" className="nav-link" onClick={() => handleLinkClick('lost-found')}>Lost & Found</a>
          {user && user.role_name === 'citizen' && (
            <a href="#my-reports" className="nav-link" onClick={() => handleLinkClick('my-reports')}>My Reports</a>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '5px' }}>
            {user ? (
              <>
                <span style={{ fontSize: '13px' }}>{user.username} ({user.role_name})</span>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="btn btn-danger btn-sm">Log Out</button>
              </>
            ) : (
              <>
                <button onClick={() => { onShowAuth('login'); setMobileMenuOpen(false); }} className="btn btn-secondary btn-sm" style={{ flex: 1, marginRight: '10px' }}>Log In</button>
                <button onClick={() => { onShowAuth('signup'); setMobileMenuOpen(false); }} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Register</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
