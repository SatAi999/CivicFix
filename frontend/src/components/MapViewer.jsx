import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, ListFilter, ShieldAlert, Eye, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon bug in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Dynamic DivIcon matching severity themes
const createCustomIcon = (severity, status) => {
  const isResolved = (status === 'RESOLVED' || status === 'CITIZEN_VERIFIED');
  const colorClass = isResolved ? 'resolved' : severity.toLowerCase();
  
  return L.divIcon({
    html: `<div class="marker-pin ${colorClass}" style="
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      background: var(--color-${colorClass});
      position: absolute;
      transform: rotate(-45deg);
      left: 50%;
      top: 50%;
      margin: -12px 0 0 -12px;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -25]
  });
};

// Sub-component to control map centering and zoom updates dynamically
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
};

const MapViewer = ({ issues, onViewDetails, onReportNew, categories }) => {
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  // Map State
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // default Bangalore
  const [mapZoom, setMapZoom] = useState(14);
  
  // Filters
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterWard, setFilterWard] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Geolocation trigger
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMapCenter([lat, lng]);
          setMapZoom(16);
        },
        (err) => alert('Unable to retrieve location.')
      );
    }
  };

  // Filter Logic
  const filteredIssues = issues.filter((issue) => {
    if (filterSeverity !== 'ALL' && issue.severity !== filterSeverity) return false;
    if (filterCategory !== 'ALL' && issue.category_name !== filterCategory) return false;
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'RESOLVED' && !['RESOLVED', 'CITIZEN_VERIFIED'].includes(issue.status)) return false;
      if (filterStatus === 'UNRESOLVED' && ['RESOLVED', 'CITIZEN_VERIFIED'].includes(issue.status)) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = issue.title.toLowerCase().includes(q);
      const descMatch = (issue.description || '').toLowerCase().includes(q);
      const idMatch = issue.id.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !idMatch) return false;
    }
    return true;
  });

  const handleIssueSelect = (issue) => {
    setSelectedIssue(issue);
    setMapCenter([issue.latitude, issue.longitude]);
    setMapZoom(16);
  };

  return (
    <div className="map-page-layout">
      {/* Sidebar List and Filters */}
      <div className="sidebar-panel">
        <div style={{ marginBottom: '20px' }}>
          <button onClick={onReportNew} className="btn btn-primary" style={{ width: '100%', marginBottom: '15px' }}>
            Report a Civic Problem
          </button>
          
          <button 
            onClick={handleLocateMe} 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Navigation size={16} />
            Near Me Locator
          </button>
        </div>

        {/* Filter Controls */}
        <div className="card" style={{ padding: '15px', marginBottom: '20px', backgroundColor: 'var(--bg-tertiary)' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ListFilter size={16} /> Filters
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <input 
                type="text" 
                className="form-control" 
                style={{ padding: '6px 10px', fontSize: '13px' }}
                placeholder="Search ticket ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select 
                className="form-control" 
                style={{ padding: '6px', fontSize: '12px' }}
                value={filterSeverity} 
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <select 
                className="form-control" 
                style={{ padding: '6px', fontSize: '12px' }}
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="UNRESOLVED">Active</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <select 
              className="form-control" 
              style={{ padding: '6px', fontSize: '12px' }}
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Showing {filteredIssues.length} registered reports
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredIssues.map((issue) => (
              <div 
                key={issue.id} 
                className={`card severity-card ${issue.severity.toLowerCase()}`}
                onClick={() => handleIssueSelect(issue)}
                style={{ 
                  cursor: 'pointer', 
                  padding: '12px', 
                  backgroundColor: selectedIssue?.id === issue.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  borderColor: selectedIssue?.id === issue.id ? 'var(--accent-primary)' : 'var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{issue.id}</span>
                  <span className={`severity-badge ${issue.severity.toLowerCase()}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{issue.severity}</span>
                </div>
                <h4 style={{ fontSize: '14px', margin: '4px 0 6px 0', color: 'var(--text-primary)' }}>{issue.title}</h4>
                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>{issue.category_name}</span>
                  <span>{issue.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Window */}
      <div className="map-wrapper">
        <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          <MapController center={mapCenter} zoom={mapZoom} />
          
          {filteredIssues.map((issue) => (
            <Marker 
              key={issue.id} 
              position={[issue.latitude, issue.longitude]}
              icon={createCustomIcon(issue.severity, issue.status)}
              eventHandlers={{
                click: () => {
                  setSelectedIssue(issue);
                },
              }}
            >
              <Popup>
                <div style={{ minWidth: '180px', color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>{issue.id}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{issue.status}</span>
                  </div>
                  <h4 style={{ fontSize: '13px', margin: '0 0 6px 0', fontWeight: 'bold' }}>{issue.title}</h4>
                  
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    <span>Category: <strong>{issue.category_name}</strong></span>
                    <span>Votes: <strong>{issue.supporters_count}</strong></span>
                  </div>
                  
                  <button 
                    onClick={() => onViewDetails(issue.id)}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', fontSize: '11px', padding: '4px' }}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapViewer;
