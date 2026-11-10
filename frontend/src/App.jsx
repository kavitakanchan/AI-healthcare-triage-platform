import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Send, 
  Activity, 
  RefreshCw, 
  History, 
  Calendar, 
  Search, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Printer, 
  PhoneCall, 
  Trash2,
  User as UserIcon 
} from 'lucide-react';

const BASE_URL = "http://127.0.0.1:8000";
const TRIAGE_URL = `${BASE_URL}/api/v1/triage`;
const HISTORY_URL = `${BASE_URL}/api/v1/triage/history`;
const SIGNUP_URL = `${BASE_URL}/api/v1/auth/signup`;
const LOGIN_URL = `${BASE_URL}/api/v1/auth/login`;

export default function App() {
  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem('triage_token') || null);
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('triage_user_email') || null);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Form inputs
  const [message, setMessage] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('female');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('ALL');

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const res = await axios.get(HISTORY_URL, config);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const url = authMode === 'signup' ? SIGNUP_URL : LOGIN_URL;

    try {
      const res = await axios.post(url, {
        email: authEmail,
        password: authPassword,
      });
      const receivedToken = res.data.access_token;
      const receivedEmail = res.data.email;

      setToken(receivedToken);
      setUserEmail(receivedEmail);
      localStorage.setItem('triage_token', receivedToken);
      localStorage.setItem('triage_user_email', receivedEmail);

      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Authentication failed. Please verify credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail(null);
    localStorage.removeItem('triage_token');
    localStorage.removeItem('triage_user_email');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const response = await axios.post(
        TRIAGE_URL,
        {
          message: message.trim(),
          age: age ? parseInt(age) : null,
          gender: gender,
          duration_days: duration ? parseInt(duration) : null,
        },
        config
      );
      setResult(response.data);
      fetchHistory();
    } catch (err) {
      setError("Server error. Check if FastAPI backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this triage record?")) return;
    try {
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      await axios.delete(`${HISTORY_URL}/${recordId}`, config);
      setHistory((prev) => prev.filter((item) => item.id !== recordId));
    } catch (err) {
      alert("Failed to delete record: " + (err.response?.data?.detail || "Server error"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getUrgencyBadge = (level) => {
    switch (level) {
      case 'EMERGENCY':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#ef4444', icon: <ShieldAlert color="#b91c1c" size={22} /> };
      case 'URGENT_CLINIC':
        return { bg: '#ffedd5', color: '#c2410c', border: '#f97316', icon: <AlertCircle color="#c2410c" size={22} /> };
      case 'ROUTINE':
        return { bg: '#dbeafe', color: '#1d4ed8', border: '#3b82f6', icon: <Clock color="#1d4ed8" size={22} /> };
      default:
        return { bg: '#dcfce7', color: '#15803d', border: '#22c55e', icon: <CheckCircle2 color="#15803d" size={22} /> };
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.recommended_next_action && item.recommended_next_action.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesUrgency = selectedUrgency === 'ALL' || item.urgency_level === selectedUrgency;
    return matchesSearch && matchesUrgency;
  });

  return (
    <div style={{ maxWidth: 880, margin: '20px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Print CSS Rules */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-slip, #printable-slip * {
            visibility: visible;
          }
          #printable-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 1px solid #000 !important;
            padding: 24px !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Bar / Navigation */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={28} color="#2563eb" />
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>AI Triage Platform</span>
        </div>
        <div>
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserIcon size={16} /> {userEmail}
              </span>
              <button 
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', color: '#475569' }}
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: '#64748b' }}>Guest Session (Sign in below to save to your account)</span>
          )}
        </div>
      </div>

      {/* Auth Card */}
      {!token && (
        <div className="no-print" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#1e293b' }}>
              {authMode === 'signup' ? 'Create a New Account' : 'Sign In to Your Account'}
            </h3>
            <button
              onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError(null); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {authMode === 'signup' ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>

          {authError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, padding: 8, borderRadius: 6, marginBottom: 10 }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="Email address"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={authLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {authMode === 'signup' ? <UserPlus size={15} /> : <LogIn size={15} />}
              {authLoading ? 'Authenticating...' : authMode === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        </div>
      )}

      {/* Triage Assessment Form */}
      <form className="no-print" onSubmit={handleSubmit} style={{ background: '#ffffff', padding: 22, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, color: '#1e293b' }}>Enter Patient Symptoms</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Age</label>
            <input
              type="number"
              placeholder="e.g. 24"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', marginTop: 4, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', marginTop: 4, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box', background: '#fff' }}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Duration (Days)</label>
            <input
              type="number"
              placeholder="e.g. 2"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', marginTop: 4, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Describe Symptoms</label>
          <textarea
            rows={4}
            placeholder="Describe symptoms clearly (e.g., sudden chest pressure, mild dry cough, scratchy throat...)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', marginTop: 4, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: loading ? '#94a3b8' : '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 6,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? <RefreshCw size={16} /> : <Send size={16} />}
          {loading ? 'Evaluating Urgency...' : 'Analyze Symptoms'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="no-print" style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: 14, borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Printable Clinical Result Slip */}
      {result && (
        <div>
          {result.urgency_level === 'EMERGENCY' && (
            <div className="no-print" style={{
              background: '#b91c1c',
              color: '#ffffff',
              padding: '16px 20px',
              borderRadius: 10,
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 4px 12px rgba(185, 28, 28, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert size={28} color="#ffffff" />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>CRITICAL EMERGENCY DETECTED</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.9 }}>
                    Do not drive yourself. Seek immediate emergency evaluation or contact local services immediately.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a 
                  href="tel:112"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    color: '#b91c1c',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: 14
                  }}
                >
                  <PhoneCall size={16} /> Call National Emergency (112)
                </a>
                <a 
                  href="tel:108"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    border: '1px solid #ffffff',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: 14
                  }}
                >
                  <PhoneCall size={16} /> Call Ambulance (108)
                </a>
              </div>
            </div>
          )}

          <div 
            id="printable-slip"
            style={{
              border: `2px solid ${getUrgencyBadge(result.urgency_level).border}`,
              borderRadius: 12,
              padding: 24,
              background: getUrgencyBadge(result.urgency_level).bg,
              marginBottom: 32
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {getUrgencyBadge(result.urgency_level).icon}
                <h2 style={{ margin: 0, fontSize: 20, color: getUrgencyBadge(result.urgency_level).color }}>
                  Urgency Tier: {result.urgency_level}
                </h2>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="no-print"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#1e293b'
                }}
              >
                <Printer size={15} /> Print / Save PDF
              </button>
            </div>

            <p style={{ margin: '8px 0', fontSize: 15, color: '#334155' }}>
              <strong>Recommended Timeframe:</strong> {result.recommended_timeframe}
            </p>
            <p style={{ margin: '8px 0', fontSize: 15, color: '#334155' }}>
              <strong>Recommended Action:</strong> {result.recommended_next_action}
            </p>
            <p style={{ margin: '8px 0', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              <strong>Clinical Rationale:</strong> {result.rationale}
            </p>

            {result.clarifying_questions && result.clarifying_questions.length > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Key Questions for Clinical Evaluation:</span>
                <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 13, color: '#334155' }}>
                  {result.clarifying_questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 16, borderTop: '1px solid #cbd5e1', paddingTop: 8, fontSize: 11, color: '#64748b' }}>
              <em>Notice: This triage record is an algorithmic care-navigation summary and does not constitute a formal diagnosis or prescription.</em>
            </div>
          </div>
        </div>
      )}

      {/* History Log */}
      <section className="no-print" style={{ marginTop: 40, borderTop: '2px solid #e2e8f0', paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={20} color="#475569" />
            <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>
              {token ? 'My Personal Triage History' : 'Recent Triage Log (Guest / Public)'}
            </h3>
          </div>
          <button 
            onClick={fetchHistory}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'transparent', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', color: '#475569' }}
          >
            <RefreshCw size={12} /> Refresh Log
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search symptoms or actions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'EMERGENCY', 'URGENT_CLINIC', 'ROUTINE', 'SELF_CARE'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedUrgency(tier)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: selectedUrgency === tier ? '#2563eb' : '#e2e8f0',
                  background: selectedUrgency === tier ? '#2563eb' : '#f8fafc',
                  color: selectedUrgency === tier ? '#ffffff' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                {tier.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <p style={{ fontSize: 14, color: '#94a3b8' }}>Loading records from database...</p>
        ) : filteredHistory.length === 0 ? (
          <p style={{ fontSize: 14, color: '#94a3b8' }}>No matching triage records found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredHistory.map((item) => {
              const badge = getUrgencyBadge(item.urgency_level);
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 8, 
                    padding: 16, 
                    background: '#ffffff',
                    borderLeft: `5px solid ${badge.border}`,
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        fontSize: 12, 
                        fontWeight: 700, 
                        color: badge.color, 
                        background: badge.bg, 
                        padding: '3px 8px', 
                        borderRadius: 4 
                      }}>
                        {item.urgency_level}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {item.age ? `Age: ${item.age}` : ''} {item.gender ? `• ${item.gender}` : ''} {item.duration_days ? `• ${item.duration_days} day(s)` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.created_at && (
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteRecord(item.id)}
                        title="Delete record"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 4
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: '4px 0 6px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                    "{item.message}"
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                    <strong>Action:</strong> {item.recommended_next_action}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
