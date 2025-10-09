import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import { API } from '@/App';

const LandingPage = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API}${endpoint}`, formData);
      onAuth(response.data.access_token, response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="logo-text">MyGlobalCFO</h1>
          </div>
          
          <h2 className="hero-title">
            Your Enterprise CFO Agent
          </h2>
          
          <p className="hero-subtitle">
            Automate finance operations, reconciliations, and reporting across multi-entity organizations in real time
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <div className="feature-icon">📧</div>
              <span>Email Integration</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <span>Real-time Dashboards</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔄</div>
              <span>Auto Reconciliation</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🏦</div>
              <span>Multi-Entity Support</span>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="auth-card">
          <div className="auth-header">
            <h3>{isLogin ? 'Welcome Back' : 'Get Started'}</h3>
            <p>{isLogin ? 'Sign in to your account' : 'Create your account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="name-input"
                />
              </div>
            )}
            
            <div className="form-group">
              <Input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                data-testid="email-input"
              />
            </div>
            
            <div className="form-group">
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                data-testid="password-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <Button 
              type="submit" 
              className="auth-button"
              disabled={loading}
              data-testid="auth-submit-button"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="auth-toggle">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="toggle-link"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h2 className="section-title">Enterprise-Grade Financial Automation</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card-icon">📧</div>
            <h3>Email Integration</h3>
            <p>Connect securely to Gmail/Outlook. Automatically extract and process financial documents from attachments.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-card-icon">🏦</div>
            <h3>Bank Connectivity</h3>
            <p>Real-time bank feeds via TrueLayer. Automatic transaction reconciliation and cash flow tracking.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-card-icon">📊</div>
            <h3>Accounting Integration</h3>
            <p>Seamless Xero integration. Auto-post transactions to correct accounts and cost centers.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-card-icon">🌍</div>
            <h3>Multi-Entity Management</h3>
            <p>Consolidate across multiple legal entities and jurisdictions with real-time group reporting.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-card-icon">🤖</div>
            <h3>AI-Powered Extraction</h3>
            <p>GPT-5 powered document parsing extracts invoice data, receipts, and statements automatically.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-card-icon">💰</div>
            <h3>Finance Sourcing</h3>
            <p>Discover optimal finance options - loans, credit lines, and grants matched to your business.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;