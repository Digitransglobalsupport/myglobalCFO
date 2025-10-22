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
            <Input
              type="password"
              placeholder="Enter new password"
              value={formData.new_password}
              onChange={(e) => setFormData({...formData, new_password: e.target.value})}
              required
            />
            <small className="password-hint">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </small>
          </div>
          
          <div className="form-group">
            <label>Confirm Password</label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
              required
            />
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
