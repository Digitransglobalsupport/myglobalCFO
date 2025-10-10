import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import { API } from '@/App';

const Settings = ({ onPreferencesUpdate }) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/user/preferences`);
      setPreferences(response.data);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateColor = (colorKey, value) => {
    const newPrefs = {
      ...preferences,
      [colorKey]: value
    };
    setPreferences(newPrefs);
    
    // Apply colors immediately for real-time preview
    applyColors(newPrefs);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/user/preferences`, preferences);
      setPreferences(response.data);
      
      // Apply colors to document
      applyColors(response.data);
      
      // Notify parent component
      if (onPreferencesUpdate) {
        onPreferencesUpdate(response.data);
      }
      
      alert('✅ Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all customizations to default?')) {
      return;
    }
    
    setSaving(true);
    try {
      const response = await axios.post(`${API}/user/preferences/reset`);
      setPreferences(response.data.preferences);
      
      // Apply default colors
      applyColors(response.data.preferences);
      
      if (onPreferencesUpdate) {
        onPreferencesUpdate(response.data.preferences);
      }
      
      alert('✅ Preferences reset to default!');
    } catch (error) {
      console.error('Error resetting preferences:', error);
      alert('Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  const applyColors = (prefs) => {
    if (!prefs) return;
    
    const root = document.documentElement;
    root.style.setProperty('--navy-primary', prefs.primary_color);
    root.style.setProperty('--navy-secondary', prefs.secondary_color);
    root.style.setProperty('--gold-accent', prefs.accent_color);
    
    // Update body background gradient
    document.body.style.background = `linear-gradient(135deg, ${prefs.background_gradient_start} 0%, ${prefs.secondary_color} 50%, ${prefs.background_gradient_end} 100%)`;
  };

  const previewColors = () => {
    applyColors(preferences);
  };

  const colorOptions = [
    {
      key: 'primary_color',
      label: 'Primary Color',
      description: 'Main dashboard background color'
    },
    {
      key: 'secondary_color',
      label: 'Secondary Color',
      description: 'Cards and dialog backgrounds'
    },
    {
      key: 'accent_color',
      label: 'Accent Color',
      description: 'Buttons, highlights, and important elements'
    },
    {
      key: 'background_gradient_start',
      label: 'Background Gradient Start',
      description: 'Top-left background color'
    },
    {
      key: 'background_gradient_end',
      label: 'Background Gradient End',
      description: 'Bottom-right background color'
    }
  ];

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1 className="page-title">Dashboard Settings</h1>
          <p className="page-subtitle">Customize your dashboard with your brand colors</p>
        </div>
        <div className="settings-actions">
          <Button onClick={previewColors} variant="outline" size="sm">
            👁️ Preview
          </Button>
          <Button onClick={resetToDefaults} variant="outline" size="sm" disabled={saving}>
            🔄 Reset to Default
          </Button>
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </Button>
        </div>
      </div>

      <div className="settings-content">
        {/* Brand Colors Section */}
        <Card className="settings-section">
          <h2 className="section-title">🎨 Brand Colors</h2>
          <p className="section-description">
            Customize the color scheme to match your brand identity
          </p>

          <div className="color-options-grid">
            {colorOptions.map((option) => (
              <div key={option.key} className="color-option-card">
                <div className="color-option-info">
                  <label className="color-label">{option.label}</label>
                  <p className="color-description">{option.description}</p>
                </div>
                
                <div className="color-picker-container">
                  <button
                    className="color-preview-button"
                    style={{ backgroundColor: preferences[option.key] }}
                    onClick={() => setActiveColorPicker(
                      activeColorPicker === option.key ? null : option.key
                    )}
                  >
                    <span className="color-hex-text">{preferences[option.key]}</span>
                  </button>
                  
                  {activeColorPicker === option.key && (
                    <div className="color-picker-popover">
                      <div className="color-picker-backdrop" onClick={() => setActiveColorPicker(null)} />
                      <div className="color-picker-content">
                        <HexColorPicker
                          color={preferences[option.key]}
                          onChange={(color) => updateColor(option.key, color)}
                        />
                        <input
                          type="text"
                          value={preferences[option.key]}
                          onChange={(e) => updateColor(option.key, e.target.value)}
                          className="color-hex-input"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Color Preview Section */}
        <Card className="settings-section">
          <h2 className="section-title">👀 Preview</h2>
          <p className="section-description">
            See how your colors look together
          </p>

          <div className="color-preview-grid">
            <div 
              className="preview-card"
              style={{ 
                background: `linear-gradient(135deg, ${preferences.background_gradient_start} 0%, ${preferences.secondary_color} 50%, ${preferences.background_gradient_end} 100%)`
              }}
            >
              <div className="preview-content" style={{ background: preferences.secondary_color }}>
                <h3>Sample Card</h3>
                <p>This is how your dashboard cards will look</p>
                <button 
                  className="preview-button"
                  style={{ 
                    background: preferences.accent_color,
                    color: preferences.primary_color
                  }}
                >
                  Sample Button
                </button>
              </div>
            </div>

            <div className="preview-colors-list">
              <div className="preview-color-item">
                <div 
                  className="preview-color-swatch" 
                  style={{ background: preferences.primary_color }}
                />
                <span>Primary</span>
              </div>
              <div className="preview-color-item">
                <div 
                  className="preview-color-swatch" 
                  style={{ background: preferences.secondary_color }}
                />
                <span>Secondary</span>
              </div>
              <div className="preview-color-item">
                <div 
                  className="preview-color-swatch" 
                  style={{ background: preferences.accent_color }}
                />
                <span>Accent</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Section */}
        <Card className="settings-section info-card">
          <h3>💡 Tips</h3>
          <ul>
            <li>Click on any color box to open the color picker</li>
            <li>Use the "Preview" button to see changes before saving</li>
            <li>Your customizations are saved per user account</li>
            <li>Click "Reset to Default" to restore the original navy & gold theme</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
