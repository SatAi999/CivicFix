import React, { useState, useEffect, useRef } from 'react';
import { assistantAPI } from '../services/api';
import { MessageSquare, X, Send, Bot, User, Loader, MapPin } from 'lucide-react';

const ChatAssistant = ({ onViewIssue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your Civic AI Assistant. How can I help you navigate civic fixes today?\n\nTry asking: \n• *'What issues have been reported near me?'*\n• *'Show unresolved road problems.'*\n• *'Why is CIV-28491 marked high priority?'*"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  const messagesEndRef = useRef(null);

  // Capture user coordinates silently for local nearby lookups
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Location not shared with assistant.')
      );
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputText('');
    setLoading(true);

    try {
      const response = await assistantAPI.chat(
        userText,
        coords ? coords.lat : null,
        coords ? coords.lng : null
      );
      
      const replyData = response.data;
      setMessages((prev) => [
        ...prev,
        { 
          sender: 'bot', 
          text: replyData.reply,
          suggestions: replyData.suggested_issues 
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I am having trouble connecting to the civic database right now. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Shutter Icon */}
      <div className="assistant-trigger" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} style={{ color: 'white' }} /> : <MessageSquare size={24} style={{ color: 'white' }} />}
      </div>

      {/* Slide drawer Panel */}
      {isOpen && (
        <div className="assistant-panel">
          <div className="assistant-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} className="text-primary" />
              <div>
                <strong style={{ fontSize: '14px', display: 'block' }}>CivicFix AI Assistant</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Online • Connected to Ward Registry</span>
              </div>
            </div>
            {coords && (
              <span style={{ fontSize: '10px', color: 'var(--color-low)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <MapPin size={10} /> Loc synced
              </span>
            )}
          </div>

          {/* Chat Messages */}
          <div className="assistant-chat">
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div className={`chat-bubble ${m.sender}`}>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.text}</p>
                </div>
                
                {/* Suggestions Cards (WOW linking shortcut) */}
                {m.suggestions && m.suggestions.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    margin: '10px 0 10px 15px',
                    maxWidth: '85%'
                  }}>
                    {m.suggestions.map((issue) => (
                      <div 
                        key={issue.id} 
                        onClick={() => {
                          setIsOpen(false);
                          onViewIssue(issue.id);
                        }}
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'var(--transition-fast)'
                        }}
                        className="suggest-card-hover"
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{issue.id}</span>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{issue.title}</div>
                        </div>
                        <span className={`severity-badge ${issue.severity.toLowerCase()}`} style={{ fontSize: '9px', padding: '2px 4px' }}>{issue.severity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble bot" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader size={14} className="spin" /> Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form className="assistant-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              className="form-control" 
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              placeholder="Ask about cases, priorities, routing..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px' }} disabled={loading}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
