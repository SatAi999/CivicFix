import React, { useState } from 'react';
import { Eye, FileImage } from 'lucide-react';

const BeforeAfterView = ({ beforeUrl, afterUrl }) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage [0, 100]
  const [isSliding, setIsSliding] = useState(false);

  const handleMouseMove = (e) => {
    if (!isSliding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const handleTouchMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={16} className="text-primary" /> Visual Resolution Evidence Audit
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Drag center bar to compare</span>
      </div>

      <div 
        className="before-after-container"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseDown={() => setIsSliding(true)}
        onMouseUp={() => setIsSliding(false)}
        onMouseLeave={() => setIsSliding(false)}
        style={{ cursor: 'ew-resize', userSelect: 'none', position: 'relative', height: '320px', backgroundColor: 'var(--bg-tertiary)' }}
      >
        {/* Before Image (Background) */}
        <div 
          className="before-after-slide"
          style={{ 
            backgroundImage: `url(${beforeUrl})`, 
            width: '100%', 
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <span className="before-after-label label-before">BEFORE</span>
        </div>

        {/* After Image (Foreground Clip-path overlay) */}
        <div 
          className="before-after-slide"
          style={{ 
            backgroundImage: `url(${afterUrl})`, 
            width: '100%', 
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
            zIndex: 5
          }}
        >
          <span className="before-after-label label-after">AFTER</span>
        </div>

        {/* Sliding Separator Handle */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${sliderPosition}%`,
            width: '3px',
            backgroundColor: 'white',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            zIndex: 10,
            transform: 'translateX(-50%)'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '2px solid var(--accent-primary)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'var(--accent-primary)',
            fontWeight: 'bold'
          }}>
            ↔
          </div>
        </div>
      </div>
      
      {/* Side-by-side Fallback for small screens / visual simplicity */}
      <div style={{ display: 'none', gridTemplateColumns: '1fr 1fr', gap: '15px' }} className="mobile-only-grid">
         <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-critical)', fontWeight: 'bold' }}>BEFORE (Citizen report)</span>
            <img src={beforeUrl} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginTop: '5px' }} alt="Before" />
         </div>
         <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-low)', fontWeight: 'bold' }}>AFTER (Repair evidence)</span>
            <img src={afterUrl} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginTop: '5px' }} alt="After" />
         </div>
      </div>
    </div>
  );
};

export default BeforeAfterView;
