import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { AlertCircle, Clock, CheckCircle, BarChart3, AlertOctagon, TrendingUp, RefreshCw } from 'lucide-react';

const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, hotspotsRes] = await Promise.all([
        analyticsAPI.dashboard(),
        analyticsAPI.hotspots()
      ]);
      setStats(statsRes.data);
      setHotspots(hotspotsRes.data.hotspots);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch municipal dashboard statistics. The database might still be seeding.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '15px', color: 'var(--text-secondary)' }}>
        <div style={{ border: '3px solid rgba(255,255,255,0.05)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <span>Aggregating city-wide civic health registry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <AlertCircle size={40} style={{ color: 'var(--color-critical)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>{error}</span>
        <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Retry Loading
        </button>
      </div>
    );
  }

  // Define HSL colors in hex for SVG styling
  const colorCritical = '#ef4444'; // Red
  const colorHigh = '#f97316';     // Orange
  const colorMedium = '#eab308';   // Yellow
  const colorLow = '#22c55e';      // Green
  const colorPrimary = '#3b82f6';  // Blue
  const colorSecondary = '#a855f7';// Purple

  // --- CUSTOM SVG CHART GENERATORS ---

  // 1. SVG Line Chart (Timeline Volume Trend)
  const renderLineChart = (data) => {
    if (!data || data.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No trend logs.</div>;
    
    const width = 500;
    const height = 150;
    const padding = 25;
    
    const maxVal = Math.max(5, ...data.map(d => d.count)) + 2;
    const pointsCount = data.length;
    
    // Convert data to points coords
    const points = data.map((d, index) => {
      const x = padding + (index / (pointsCount - 1)) * (width - padding * 2);
      const y = height - padding - (d.count / maxVal) * (height - padding * 2);
      return { x, y, date: d.date, count: d.count };
    });
    
    // Draw lines path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // Draw filled area path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    
    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorSecondary} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorSecondary} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        <line x1={padding} y1={(height - padding * 2) / 2 + padding} x2={width - padding} y2={(height - padding * 2) / 2 + padding} stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        
        {/* Filled Area */}
        <path d={areaD} fill="url(#glowGrad)" />
        
        {/* Chart Line */}
        <path d={pathD} fill="none" stroke={colorSecondary} strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Data Circles & Tooltips */}
        {points.map((p, i) => (
          <g key={i} className="chart-point">
            <circle cx={p.x} cy={p.y} r="4" fill={colorSecondary} stroke="var(--bg-secondary)" strokeWidth="1.5" />
            {/* Value Label */}
            <text x={p.x} y={p.y - 8} fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">{p.count}</text>
            {/* Axis Label */}
            <text x={p.x} y={height - 6} fill="var(--text-muted)" fontSize="9" textAnchor="middle">{p.date}</text>
          </g>
        ))}
      </svg>
    );
  };

  // 2. SVG Bar Chart (Category distribution)
  const renderBarChart = (data) => {
    if (!data || data.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No category data.</div>;
    
    // Sort and limit to top 6 categories for UI sanity
    const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 6);
    
    const width = 500;
    const height = 180;
    const padding = 30;
    const chartHeight = height - padding * 2;
    
    const maxVal = Math.max(2, ...sortedData.map(d => d.count));
    const barWidth = 35;
    const gap = (width - padding * 2 - barWidth * sortedData.length) / (sortedData.length - 1 || 1);
    
    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        {/* Bottom axis line */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="1" />
        
        {sortedData.map((d, index) => {
          const barHeight = (d.count / maxVal) * chartHeight;
          const x = padding + index * (barWidth + gap);
          const y = height - padding - barHeight;
          
          return (
            <g key={index}>
              {/* Glowing vertical bar */}
              <rect 
                x={x} 
                y={y} 
                width={barWidth} 
                height={barHeight} 
                rx="4" 
                fill={colorPrimary}
                style={{ filter: 'drop-shadow(0 2px 8px rgba(59, 130, 246, 0.2))' }}
              />
              {/* Value Indicator */}
              <text x={x + barWidth / 2} y={y - 8} fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">
                {d.count}
              </text>
              {/* Label - split or shorten to fit */}
              <text x={x + barWidth / 2} y={height - 12} fill="var(--text-secondary)" fontSize="9" textAnchor="middle">
                {d.category.length > 8 ? `${d.category.substring(0, 7)}.` : d.category}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // 3. SVG Percentage Ring / Stacked bars (Priority/Severity Distribution)
  const renderSeverityBar = (data) => {
    const critical = data.find(d => d.severity === 'CRITICAL')?.count || 0;
    const high = data.find(d => d.severity === 'HIGH')?.count || 0;
    const medium = data.find(d => d.severity === 'MEDIUM')?.count || 0;
    const low = data.find(d => d.severity === 'LOW')?.count || 0;
    
    const total = critical + high + medium + low || 1;
    
    const pctCritical = (critical / total) * 100;
    const pctHigh = (high / total) * 100;
    const pctMedium = (medium / total) * 100;
    const pctLow = (low / total) * 100;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        {/* Segmented Progress Bar */}
        <div style={{
          height: '16px',
          width: '100%',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          display: 'flex',
          border: '1px solid var(--border-color)'
        }}>
          {critical > 0 && <div style={{ width: `${pctCritical}%`, backgroundColor: colorCritical }} title={`Critical: ${critical}`} />}
          {high > 0 && <div style={{ width: `${pctHigh}%`, backgroundColor: colorHigh }} title={`High: ${high}`} />}
          {medium > 0 && <div style={{ width: `${pctMedium}%`, backgroundColor: colorMedium }} title={`Medium: ${medium}`} />}
          {low > 0 && <div style={{ width: `${pctLow}%`, backgroundColor: colorLow }} title={`Low: ${low}`} />}
        </div>
        
        {/* Colored labels grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colorCritical }} />
            <span style={{ color: 'var(--text-secondary)' }}>Critical:</span>
            <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{critical} cases ({Math.round(pctCritical)}%)</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colorHigh }} />
            <span style={{ color: 'var(--text-secondary)' }}>High:</span>
            <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{high} cases ({Math.round(pctHigh)}%)</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colorMedium }} />
            <span style={{ color: 'var(--text-secondary)' }}>Medium:</span>
            <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{medium} cases ({Math.round(pctMedium)}%)</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colorLow }} />
            <span style={{ color: 'var(--text-secondary)' }}>Low:</span>
            <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{low} cases ({Math.round(pctLow)}%)</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Civic Health Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>AI-driven municipal case statistics and geospatial hotspots overview.</p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '30px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: colorCritical }}><AlertOctagon size={24} /></div>
          <div>
            <div className="stat-val" style={{ color: colorCritical, fontSize: '28px' }}>{stats?.critical_count || 0}</div>
            <div className="stat-lbl">Critical Incidents</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(249, 115, 22, 0.1)', color: colorHigh }}><AlertCircle size={24} /></div>
          <div>
            <div className="stat-val" style={{ color: colorHigh, fontSize: '28px' }}>{(stats?.high_count || 0) + (stats?.critical_count || 0)}</div>
            <div className="stat-lbl">High Priority / Urgent</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: colorPrimary }}><BarChart3 size={24} /></div>
          <div>
            <div className="stat-val" style={{ color: 'var(--text-primary)', fontSize: '28px' }}>{stats?.total_open || 0}</div>
            <div className="stat-lbl">Active Open Issues</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: colorLow }}><CheckCircle size={24} /></div>
          <div>
            <div className="stat-val" style={{ color: colorLow, fontSize: '28px' }}>{stats?.total_resolved || 0}</div>
            <div className="stat-lbl">Cases Closed</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: colorSecondary }}><Clock size={24} /></div>
          <div>
            <div className="stat-val" style={{ color: colorSecondary, fontSize: '28px' }}>{stats?.avg_resolution_days || 2.8}d</div>
            <div className="stat-lbl">Avg Resolution Time</div>
          </div>
        </div>
      </div>

      {/* Custom SVG Charts Layout */}
      <div className="grid-2" style={{ marginBottom: '40px' }}>
        <div className="card card-glass">
          <h3 style={{ fontSize: '15px', marginBottom: '20px', color: 'var(--text-primary)' }}>Issue Load by Category</h3>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderBarChart(stats?.by_category)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card card-glass" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '15px', marginBottom: '15px', color: 'var(--text-primary)' }}>Severity Priority Registry</h3>
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              {stats ? renderSeverityBar(stats.by_severity) : <span className="text-muted">Loading priority...</span>}
            </div>
          </div>

          <div className="card card-glass" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '15px', marginBottom: '15px', color: 'var(--text-primary)' }}>Volume Trend (Past Week)</h3>
            <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderLineChart(stats?.timeline_trend)}
            </div>
          </div>
        </div>
      </div>

      {/* Geospatial Hotspots Clustering */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} style={{ color: colorSecondary }} />
          Civic Hotspot Intelligence (Emerging Hotspots)
        </h2>

        {hotspots.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No spatial clusters detected in the active registry database.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {hotspots.map((hot, idx) => (
              <div key={idx} className="card" style={{
                background: 'radial-gradient(circle at 1% 1%, rgba(168, 85, 247, 0.06), transparent 70%)',
                border: '1px solid rgba(168, 85, 247, 0.22)',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'hsl(263, 75%, 75%)' }}>CLUSTER</span>
                    <strong style={{ fontSize: '15px' }}>{hot.ward} Area</strong>
                  </div>
                  <span style={{ color: 'var(--color-high)', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📈 +{hot.growth_rate}% Week-over-Week
                  </span>
                </div>

                <div className="grid-3" style={{ gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Clustered Cases</span>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>{hot.report_count} tickets</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dominant Categories</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {hot.main_categories.join(', ')}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cluster Coordinates</span>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {hot.center_lat.toFixed(4)}, {hot.center_lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(13, 17, 28, 0.5)',
                  borderLeft: '4px solid var(--accent-secondary)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6'
                }}>
                  {hot.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
