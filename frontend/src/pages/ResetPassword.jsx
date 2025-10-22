import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import { API } from '@/App';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    } else {
      setError('Invalid reset link. Please request a new password reset.');
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await axios.get(`${API}/auth/verify-reset-token/${tokenToVerify}`);
      if (response.data.valid) {
        setTokenValid(true);
      } else {
        setError(response.data.message || 'Invalid or expired reset link');
      }
    } catch (err) {
      setError('Failed to verify reset link. Please request a new one.');
    } finally {
      setVerifying(false);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (formData.new_password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.new_password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API}/auth/reset-password`, {
        token: token,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      });
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="reset-password-page">
        <Card className="reset-password-card">
          <div className="reset-password-header">
            <h3>Verifying Reset Link</h3>
            <p>Please wait...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <Card className="reset-password-card">
          <div className="reset-password-header success">
            <h3>✅ Password Reset Successful!</h3>
            <p>Your password has been reset successfully.</p>
            <p>Redirecting to login page...</p>
          </div>
          <Button 
            onClick={() => navigate('/')}
            className="auth-button"
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-page">
        <Card className="reset-password-card">
          <div className="reset-password-header">
            <h3>Invalid Reset Link</h3>
            <p className="error-message">{error}</p>
          </div>
          <Button 
            onClick={() => navigate('/')}
            className="auth-button"
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <Card className="reset-password-card">
        <div className="reset-password-header">
          <h3>Create New Password</h3>
          <p>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label>New Password</label>
            <div className="password-input-wrapper">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                required
                className="password-input-field"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="password-toggle-btn"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10
                }}
                aria-pressed={showNewPassword}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                title={showNewPassword ? "Hide new password" : "Show new password"}
                tabIndex={0}
              >
                {showNewPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
              <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {showNewPassword ? "New password is visible" : "New password is hidden"}
              </span>
            </div>
            <small className="password-hint">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </small>
          </div>
          
          <div className="form-group">
            <label>Confirm Password</label>
            <div className="password-input-wrapper">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                required
                className="password-input-field"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle-btn"
                aria-pressed={showConfirmPassword}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                tabIndex={0}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
              <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {showConfirmPassword ? "Confirm password is visible" : "Confirm password is hidden"}
              </span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <Button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>

        <div className="back-to-login">
          <button 
            onClick={() => navigate('/')}
            className="toggle-link"
            type="button"
          >
            Back to Login
          </button>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
