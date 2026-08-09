import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Mail, Plus, Filter, Tag, Check } from 'lucide-react';
import { issuesAPI } from '../services/api';

const LostFoundView = ({ issues, onReportNew, onViewDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'lost', 'found'
  const [selectedItem, setSelectedItem] = useState(null);
  const [claimNotes, setClaimNotes] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Filter issues of category "Lost and Found"
  const lostFoundItems = issues.filter(
    (issue) => 
      issue.category_name === 'Lost and Found' || 
      (issue.category && issue.category.name === 'Lost and Found')
  );

  const getSubtype = (item) => {
    const text = (item.title + ' ' + item.description).toLowerCase();
    if (text.includes('found')) return 'FOUND';
    return 'LOST';
  };

  const filteredItems = lostFoundItems.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location?.address || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const type = getSubtype(item);
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'lost' && type === 'LOST') ||
      (filterType === 'found' && type === 'FOUND');
      
    return matchesSearch && matchesType;
  });

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    setClaimSuccess(true);
    setTimeout(() => {
      setClaimSuccess(false);
      setSelectedItem(null);
      setClaimNotes('');
    }, 2500);
  };

  return (
    <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Lost & Found Registry</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Recover lost belongings or report items found in municipal areas.</p>
        </div>
        <button 
          onClick={onReportNew} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Report Lost/Found Item
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card card-glass" style={{ padding: '15px', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="form-control"
            placeholder="Search items by description, keyword, or street..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setFilterType('all')} 
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Show All
          </button>
          <button 
            onClick={() => setFilterType('lost')} 
            className={`btn btn-sm ${filterType === 'lost' ? 'btn-primary' : 'btn-secondary'}`}
            style={filterType === 'lost' ? { background: 'var(--color-critical)' } : {}}
          >
            Lost Items
          </button>
          <button 
            onClick={() => setFilterType('found')} 
            className={`btn btn-sm ${filterType === 'found' ? 'btn-primary' : 'btn-secondary'}`}
            style={filterType === 'found' ? { background: 'var(--color-low)' } : {}}
          >
            Found Items
          </button>
        </div>
      </div>

      {/* Grid of Items */}
      {filteredItems.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          No lost or found items match the search filters.
        </div>
      ) : (
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredItems.map((item) => {
            const type = getSubtype(item);
            const image = item.media.find(m => !m.is_resolution);
            
            return (
              <div key={item.id} className="card card-glass" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {image ? (
                  <img 
                    src={`${window.BACKEND_URL || 'http://localhost:8000'}${image.media_path}`} 
                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }} 
                    alt={item.title} 
                  />
                ) : (
                  <div style={{ height: '180px', backgroundColor: 'var(--bg-tertiary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No Photo Provided
                  </div>
                )}
                
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 'bold', 
                      padding: '3px 8px', 
                      borderRadius: 'var(--radius-sm)', 
                      backgroundColor: type === 'LOST' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: type === 'LOST' ? 'var(--color-critical)' : 'var(--color-low)'
                    }}>
                      {type}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {item.id}</span>
                  </div>

                  <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px', flex: 1, lineBreak: 'anywhere' }}>
                    {item.description.length > 90 ? `${item.description.substring(0, 85)}...` : item.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={12} className="text-primary" />
                      <span>{item.location?.address || 'Municipal area'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={12} />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => onViewDetails(item.id)} 
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      Audit Trail
                    </button>
                    <button 
                      onClick={() => setSelectedItem(item)} 
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      {type === 'LOST' ? 'Found It' : 'Claim Item'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim / Contact Dialog Popup */}
      {selectedItem && (
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
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
              {getSubtype(selectedItem) === 'LOST' ? 'Found This Belonging?' : 'Claim This Item'}
            </h3>
            
            {claimSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                  <Check size={20} />
                </div>
                <strong>Verification Request Dispatched!</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                  The owner has been notified. They will contact you through the registry mail interface.
                </p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                  Item: <strong>{selectedItem.title}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="claim-notes">Verification / Contact message</label>
                  <textarea 
                    id="claim-notes"
                    className="form-control"
                    rows="3"
                    placeholder="Provide details to verify ownership or coordinate item drop-off..."
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)} style={{ flex: 1 }}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                    Submit Claim Info
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LostFoundView;
