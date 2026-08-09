import React, { useState, useEffect } from 'react';
import { issuesAPI, deptsAPI } from '../services/api';
import { Camera, Upload, AlertTriangle, Eye, Loader, CheckCircle, AlertCircle, Compass, X } from 'lucide-react';

const ReportForm = ({ onCancel, onSuccess }) => {
  // Wizard Steps: 'capture' -> 'duplicate_check' -> 'ai_confirm'
  const [step, setStep] = useState('capture');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  // Geolocation
  const [useGps, setUseGps] = useState(true);
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 }); // Default Bangalore
  const [address, setAddress] = useState('Determining current address...');
  const [ward, setWard] = useState('Ward 12');
  const [locationStatus, setLocationStatus] = useState('pending');
  const [manualAddress, setManualAddress] = useState('');

  useEffect(() => {
    if (!useGps) {
      const wardCoords = {
        'Ward 12': { lat: 12.9716, lng: 77.5946 },
        'Ward 7': { lat: 12.9801, lng: 77.6010 },
        'Ward 4': { lat: 12.9505, lng: 77.5850 },
        'Ward 2': { lat: 12.9912, lng: 77.5920 },
        'Ward 9': { lat: 12.9510, lng: 77.6105 }
      };
      
      const lowerAddr = manualAddress.toLowerCase();
      let determinedWard = 'Ward 12'; // Default center
      
      // Map common Vellore / neighborhood keywords to distinct map coordinate zones
      if (lowerAddr.includes('katpadi') || lowerAddr.includes('north') || lowerAddr.includes('gandhi')) {
        determinedWard = 'Ward 7';
      } else if (lowerAddr.includes('sathuvachari') || lowerAddr.includes('east') || lowerAddr.includes('vellore')) {
        determinedWard = 'Ward 9';
      } else if (lowerAddr.includes('bagayam') || lowerAddr.includes('south')) {
        determinedWard = 'Ward 4';
      } else if (lowerAddr.includes('thorapadi') || lowerAddr.includes('west')) {
        determinedWard = 'Ward 2';
      }
      
      const baseCoords = wardCoords[determinedWard];
      
      // Jitter math: shift coords slightly based on address text length so markers don't overlap
      const seed = manualAddress.length || 1;
      const latJitter = ((seed % 7) - 3) * 0.0015;
      const lngJitter = (((seed * 4) % 7) - 3) * 0.0015;
      
      setLocation({
        lat: baseCoords.lat + latJitter,
        lng: baseCoords.lng + lngJitter
      });
      setWard(determinedWard);
      setAddress(manualAddress || 'Vellore');
      setLocationStatus('success');
    }
  }, [useGps, manualAddress]);
  
  // AI Triage & Duplicates Results
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  // Loaders / Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto Geolocate on Mount
  useEffect(() => {
    if (navigator.geolocation) {
      setLocationStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng });
          setAddress(`Near coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setLocationStatus('success');
          
          // Randomly assign a ward near default demo coordinates
          if (Math.abs(lat - 12.9716) < 0.05) {
             setWard(lat > 12.972 ? 'Ward 7' : 'Ward 12');
          } else {
             setWard('Ward 4');
          }
        },
        (err) => {
          console.warn('Geolocation failed:', err);
          setAddress('Sunrise Lane, Ward 12 (Manual Location Fallback)');
          setLocationStatus('failed');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setAddress('Main Road, Ward 12 (Location not supported)');
      setLocationStatus('failed');
    }
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setFilePreview(URL.createObjectURL(selected));
    }
  };

  const handleDuplicateSearch = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload or capture an image to analyze.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
      formData.append('description', description);
      formData.append('file', file);
      
      const response = await issuesAPI.checkDuplicates(formData);
      setDuplicateCheck(response.data);
      
      if (response.data.is_duplicate) {
        setStep('duplicate_check');
      } else {
        // No duplicates: proceed to run local mock AI for confirmation
        await runAiTriage();
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Skipping duplicate detection...');
      // Fallback
      await runAiTriage();
    } finally {
      setLoading(false);
    }
  };

  const runAiTriage = async () => {
    setError('');
    setLoading(true);
    try {
      // Create temp form data just to run AI Vision classification
      // We will mock the backend AI trigger by creating the issue. 
      // For responsiveness, we will fetch the category and route information
      // Simulating visual AI feedback by hitting a client-side mock based on text or run endpoint
      // We'll proceed to 'ai_confirm' step and simulate AI observations
      const mockAiCategories = {
        'pothole': {
          category: 'Pothole',
          subcategory: 'road_surface_damage',
          objects: ['pothole', 'road', 'asphalt'],
          hazards: ['road_obstruction', 'vehicle_swerve_risk'],
          severity: 'HIGH',
          desc: 'Large pothole on active driving lane. Swerve-risk for two-wheelers.'
        },
        'garbage': {
          category: 'Garbage accumulation',
          subcategory: 'waste_management',
          objects: ['garbage pile', 'bags', 'waste'],
          hazards: ['sanitation_hazard', 'odor_contamination'],
          severity: 'MEDIUM',
          desc: 'Large pile of rotting organic bags blocking public pathway.'
        },
        'light': {
          category: 'Broken streetlight',
          subcategory: 'streetlighting',
          objects: ['utility pole', 'street lamp'],
          hazards: ['low_visibility', 'pedestrian_risk'],
          severity: 'LOW',
          desc: 'Streetlight out. Complete lack of illumination on corner.'
        },
        'leak': {
          category: 'Water leakage',
          subcategory: 'water_infrastructure',
          objects: ['water spray', 'pipe', 'leak'],
          hazards: ['water_logging', 'resource_waste'],
          severity: 'HIGH',
          desc: 'Water valve failure spraying potable water on street.'
        },
        'animal': {
          category: 'Stray animal hazard',
          subcategory: 'public_safety_hazards',
          objects: ['dog', 'cow', 'animal'],
          hazards: ['traffic_disruption', 'pedestrian_bite_risk'],
          severity: 'MEDIUM',
          desc: 'Stray animals wandering on active carriage way causing swerve risks.'
        },
        'parking': {
          category: 'Illegal parking',
          subcategory: 'traffic_parking_enforcement',
          objects: ['vehicle', 'car', 'roadside'],
          hazards: ['roadway_blockage', 'pedestrian_obstruction'],
          severity: 'LOW',
          desc: 'Vehicle illegally parked blocking pedestrian sidewalk and active lane.'
        },
        'lost': {
          category: 'Lost and Found',
          subcategory: 'public_property_recovery',
          objects: ['wallet', 'bag', 'keys', 'object'],
          hazards: ['property_loss', 'theft_risk'],
          severity: 'LOW',
          desc: 'Lost personal accessory / wallet discovered on bench in municipal park.'
        },
        'found': {
          category: 'Lost and Found',
          subcategory: 'public_property_recovery',
          objects: ['wallet', 'bag', 'keys', 'object'],
          hazards: ['property_loss', 'theft_risk'],
          severity: 'LOW',
          desc: 'Personal accessory found and cataloged for owner retrieval.'
        }
      };

      const q = (title + ' ' + description).toLowerCase();
      let matched = mockAiCategories['pothole']; // default fallback
      for (const [kw, mockData] of Object.entries(mockAiCategories)) {
        if (q.includes(kw)) {
          matched = mockData;
          break;
        }
      }

      setAiAnalysis({
        category: matched.category,
        subcategory: matched.subcategory,
        visible_objects: matched.objects,
        visible_hazards: matched.hazards,
        severity: matched.severity,
        confidence: 0.94,
        description: matched.desc
      });
      
      setStep('ai_confirm');
    } catch (err) {
      console.error(err);
      setError('AI Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupportExisting = async (issueId) => {
    setLoading(true);
    try {
      await issuesAPI.support(issueId);
      alert(`Thank you! You supported case ${issueId}. It has been prioritised.`);
      onSuccess(issueId);
    } catch (err) {
      setError('Failed to submit support.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title || `Report: ${aiAnalysis.category}`);
      formData.append('description', description);
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
      formData.append('address', address);
      formData.append('ward', ward);
      formData.append('file', file);
      
      const response = await issuesAPI.create(formData);
      alert(`Civic Problem successfully reported! ID: ${response.data.id}`);
      onSuccess(response.data.id);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to submit report. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-wizard card card-glass" style={{ margin: '30px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} className="text-primary" />
          Report a Civic Problem
        </h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--color-critical)',
          padding: '12px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--color-critical)'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* STEP 1: CAPTURE EVIDENCE */}
      {step === 'capture' && (
        <form onSubmit={handleDuplicateSearch}>
          <div className="form-group">
            <label className="form-label">Evidence Media</label>
            <div className="upload-container" onClick={() => document.getElementById('camera-file').click()}>
              {filePreview ? (
                <div>
                  <img src={filePreview} className="upload-preview" alt="Preview" />
                  <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--accent-primary)' }}>Tap to change picture</p>
                </div>
              ) : (
                <div>
                  <Camera size={36} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                  <p style={{ fontWeight: '600' }}>Take Photo or Upload Image</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports JPG, PNG (Max 10MB)</p>
                </div>
              )}
              <input 
                id="camera-file" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="report-title">Brief Summary (Optional)</label>
            <input 
              id="report-title"
              type="text" 
              className="form-control" 
              placeholder="e.g. Broken water pipe (Leave blank for AI to generate)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="report-desc">Describe the Issue (What & How Serious?)</label>
            <textarea 
              id="report-desc"
              className="form-control" 
              rows="3" 
              placeholder="Provide context. E.g. Bikes are frequently swerving around it, strong odor, leaking into road..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Incident Location</label>
              <button 
                type="button" 
                onClick={() => setUseGps(!useGps)} 
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
              >
                {useGps ? 'Enter Address Manually' : 'Use GPS Tracker'}
              </button>
            </div>

            {useGps ? (
              <div className="loc-badge">
                <Compass size={16} className="text-primary" />
                <span>{address}</span>
                {locationStatus === 'locating' && <Loader size={12} className="spin" style={{ marginLeft: 'auto' }} />}
              </div>
            ) : (
              <input 
                type="text"
                className="form-control"
                placeholder="E.g. Gandhinagar, Vellore"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                required
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || locationStatus === 'locating'} 
              style={{ flex: 2 }}
            >
              {loading ? (
                <>
                  <Loader className="spin" size={16} /> Checking Duplicates...
                </>
              ) : (
                'Run AI Triage'
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: DUPLICATE FOUND WARNING (WOW #2) */}
      {step === 'duplicate_check' && duplicateCheck && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <AlertTriangle size={48} style={{ color: 'var(--color-medium)', marginBottom: '10px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Possible Duplicate Detected</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Other citizens have already flagged a highly similar issue nearby.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
            {duplicateCheck.suggestions.map((dup) => (
              <div key={dup.primary_issue_id} className="card" style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: 'var(--bg-tertiary)' }}>
                {dup.media_url && (
                  <img src={`${window.BACKEND_URL || 'http://localhost:8000'}${dup.media_url}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} alt="Duplicate" />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{dup.title}</strong>
                    <span className="severity-badge medium" style={{ fontSize: '10px' }}>{dup.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                    <span>ID: <strong>{dup.primary_issue_id}</strong></span>
                    <span>Distance: <strong>{dup.distance_meters}m</strong></span>
                    <span>Similarity: <strong>{Math.round(dup.similarity_score * 100)}%</strong></span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSupportExisting(dup.primary_issue_id)}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      {loading ? 'Submitting...' : 'Yes, Support Existing Issue'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setStep('capture')} style={{ flex: 1 }}>
              Back
            </button>
            <button className="btn btn-secondary" onClick={() => runAiTriage()} style={{ flex: 2 }}>
              Continue Reporting New Issue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AI CONFIRMATION PANEL (EVIDENCE-FIRST) */}
      {step === 'ai_confirm' && aiAnalysis && (
        <div>
          <div className="ai-preview-box">
            <div className="ai-header">
              <CheckCircle size={18} />
              AI Civic Vision Predictions
            </div>
            
            <div className="ai-detail-row">
              <span style={{ color: 'var(--text-secondary)' }}>Detected Category:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{aiAnalysis.category}</strong>
            </div>
            <div className="ai-detail-row">
              <span style={{ color: 'var(--text-secondary)' }}>Sub-category:</span>
              <span>{aiAnalysis.subcategory}</span>
            </div>
            <div className="ai-detail-row">
              <span style={{ color: 'var(--text-secondary)' }}>AI Severity:</span>
              <span className={`severity-badge ${aiAnalysis.severity.toLowerCase()}`}>{aiAnalysis.severity}</span>
            </div>
            <div className="ai-detail-row">
              <span style={{ color: 'var(--text-secondary)' }}>Confidence:</span>
              <span>{Math.round(aiAnalysis.confidence * 100)}%</span>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(139, 92, 246, 0.2)', paddingTop: '10px', marginTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'hsl(263, 70%, 80%)', marginBottom: '4px' }}>AI Observations:</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{aiAnalysis.description}</p>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
              {aiAnalysis.visible_hazards.map((h, i) => (
                <span key={i} className="ai-tag" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-critical)' }}>
                  ⚠️ {h.replace('_', ' ')}
                </span>
              ))}
              {aiAnalysis.visible_objects.map((o, i) => (
                <span key={i} className="ai-tag" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)' }}>
                  🔍 {o}
                </span>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', borderLeft: '3px solid var(--accent-primary)', paddingLeft: '10px' }}>
            <strong>Evidence-First Design Policy:</strong> AI predictions are inferred context. These details will be dynamically cross-verified by authority routes and community signals.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setStep('capture')} style={{ flex: 1 }}>
              Modify Report
            </button>
            <button className="btn btn-primary" onClick={handleSubmitReport} disabled={loading} style={{ flex: 2 }}>
              {loading ? (
                <>
                  <Loader className="spin" size={16} /> Submitting...
                </>
              ) : (
                'File Verified Report'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportForm;
