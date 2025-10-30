import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import { API } from '@/App';

// Get user info from context or localStorage
const getUserFromStorage = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

const Settings = ({ onPreferencesUpdate, companies, onDeleteEntity, showAddCompany, setShowAddCompany, newCompany, setNewCompany, handleAddCompany }) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const [aiAdvisorSettings, setAiAdvisorSettings] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [entityGroups, setEntityGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', entity_ids: [] });
  const [editingGroup, setEditingGroup] = useState(null);
  
  // Prevent body scroll when color picker is open
  useEffect(() => {
    if (activeColorPicker) {
      document.body.classList.add('color-picker-open');
    } else {
      document.body.classList.remove('color-picker-open');
    }
    return () => {
      document.body.classList.remove('color-picker-open');
    };
  }, [activeColorPicker]);
  const [activeScreen, setActiveScreen] = useState('menu'); // menu, colors, kpis, layout
  const [kpiConfig, setKpiConfig] = useState([
    { id: 'revenue', label: 'Total Group Revenue', enabled: true, order: 0 },
    { id: 'ebitda', label: 'Group EBITDA', enabled: true, order: 1 },
    { id: 'cash', label: 'Total Group Cash', enabled: true, order: 2 },
    { id: 'runway', label: 'Group Runway', enabled: true, order: 3 }
  ]);

  useEffect(() => {
    loadPreferences();
    loadAIAdvisorSettings();
    loadEntityGroups();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/user/preferences`);
      setPreferences(response.data);
      
      // Apply loaded colors immediately
      applyColors(response.data);
      
      // Load KPI config if exists
      if (response.data.kpi_config && response.data.kpi_config.length > 0) {
        setKpiConfig(response.data.kpi_config);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadAIAdvisorSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/ai-advisor`);
      setAiAdvisorSettings(response.data.settings);
      setIsAdmin(response.data.is_admin || false);
      if (response.data.all_users) {
        setAllUsers(response.data.all_users);
      }
    } catch (error) {
      console.error('Error loading AI Advisor settings:', error);
    }
  };

  const loadEntityGroups = async () => {
    try {
      const response = await axios.get(`${API}/entity-groups`);
      setEntityGroups(response.data);
    } catch (error) {
      console.error('Error loading entity groups:', error);
    }
  };

  const saveAIAdvisorSettings = async () => {
    try {
      await axios.put(`${API}/settings/ai-advisor`, {
        global_enabled: aiAdvisorSettings.global_enabled,
        authorized_user_ids: aiAdvisorSettings.authorized_user_ids || []
      });
      alert('✅ AI Advisor settings saved successfully!');
      loadAIAdvisorSettings();
    } catch (error) {
      console.error('Error saving AI Advisor settings:', error);
      alert('Failed to save AI Advisor settings');
    }
  };

  const toggleUserAuthorization = (userId) => {
    const currentIds = aiAdvisorSettings.authorized_user_ids || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];
    
    setAiAdvisorSettings({
      ...aiAdvisorSettings,
      authorized_user_ids: newIds
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (newGroup.entity_ids.length === 0) {
      alert('Please select at least one entity for the group');
      return;
    }

    try {
      await axios.post(`${API}/entity-groups`, newGroup);
      setShowCreateGroup(false);
      setNewGroup({ name: '', description: '', entity_ids: [] });
      loadEntityGroups();
      alert('✅ Entity group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create entity group');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      await axios.put(`${API}/entity-groups/${editingGroup.id}`, {
        name: editingGroup.name,
        description: editingGroup.description,
        entity_ids: editingGroup.entity_ids
      });
      setEditingGroup(null);
      loadEntityGroups();
      alert('✅ Entity group updated successfully!');
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update entity group');
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/entity-groups/${groupId}`);
      loadEntityGroups();
      alert(`Group "${groupName}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  const toggleEntityInGroup = (entityId, isCreating = true) => {
    const target = isCreating ? newGroup : editingGroup;
    const setTarget = isCreating ? setNewGroup : setEditingGroup;

    const currentIds = target.entity_ids || [];
    const newIds = currentIds.includes(entityId)
      ? currentIds.filter(id => id !== entityId)
      : [...currentIds, entityId];
    
    setTarget({
      ...target,
      entity_ids: newIds
    });
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
      const dataToSave = {
        ...preferences,
        kpi_config: kpiConfig
      };
      
      const response = await axios.put(`${API}/user/preferences`, dataToSave);
      setPreferences(response.data);
      
      // Apply colors to document
      applyColors(response.data);
      
      // Notify parent component
      if (onPreferencesUpdate) {
        onPreferencesUpdate(response.data);
      }
      
      alert('✅ Preferences saved successfully!');
      
      // Reload page to apply KPI changes
      window.location.reload();
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


  const toggleKpi = (kpiId) => {
    setKpiConfig(kpiConfig.map(kpi => 
      kpi.id === kpiId ? { ...kpi, enabled: !kpi.enabled } : kpi
    ));
  };

  const updateKpiLabel = (kpiId, newLabel) => {
    setKpiConfig(kpiConfig.map(kpi => 
      kpi.id === kpiId ? { ...kpi, label: newLabel } : kpi
    ));
  };

  const moveKpiUp = (kpiId) => {
    const index = kpiConfig.findIndex(kpi => kpi.id === kpiId);
    if (index > 0) {
      const newConfig = [...kpiConfig];
      [newConfig[index], newConfig[index - 1]] = [newConfig[index - 1], newConfig[index]];
      newConfig.forEach((kpi, idx) => kpi.order = idx);
      setKpiConfig(newConfig);
    }
  };

  const moveKpiDown = (kpiId) => {
    const index = kpiConfig.findIndex(kpi => kpi.id === kpiId);
    if (index < kpiConfig.length - 1) {
      const newConfig = [...kpiConfig];
      [newConfig[index], newConfig[index + 1]] = [newConfig[index + 1], newConfig[index]];
      newConfig.forEach((kpi, idx) => kpi.order = idx);
      setKpiConfig(newConfig);
    }
  };


  const applyColors = (prefs) => {
    if (!prefs) return;
    
    const root = document.documentElement;
    
    // Apply all color CSS variables
    root.style.setProperty('--navy-primary', prefs.primary_color);
    root.style.setProperty('--navy-secondary', prefs.secondary_color);
    root.style.setProperty('--navy-tertiary', prefs.secondary_color);
    root.style.setProperty('--gold-accent', prefs.accent_color);
    
    // Update body background gradient
    document.body.style.background = `linear-gradient(135deg, ${prefs.background_gradient_start} 0%, ${prefs.secondary_color} 50%, ${prefs.background_gradient_end} 100%)`;
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

  // Render Settings Menu
  if (activeScreen === 'menu') {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <div>
            <h1 className="page-title">Dashboard Settings</h1>
            <p className="page-subtitle">Configure your dashboard preferences</p>
          </div>
        </div>

        <div className="settings-menu-grid">
          {isAdmin && (
            <div className="settings-menu-card" onClick={() => setActiveScreen('ai-advisor')}>
              <div className="menu-card-icon">🤖</div>
              <h3 className="menu-card-title">AI Advisor Access</h3>
              <p className="menu-card-description">
                Control AI Financial Advisor access and authorize specific users
              </p>
              <div className="menu-card-button">Manage Access →</div>
            </div>
          )}

          <div className="settings-menu-card" onClick={() => setActiveScreen('entity-groups')}>
            <div className="menu-card-icon">📁</div>
            <h3 className="menu-card-title">Entity Groups</h3>
            <p className="menu-card-description">
              Create groups to view combined financials from multiple entities
            </p>
            <div className="menu-card-button">Manage Groups →</div>
          </div>

          <div className="settings-menu-card" onClick={() => setActiveScreen('kpis')}>
            <div className="menu-card-icon">📊</div>
            <h3 className="menu-card-title">KPI Configuration</h3>
            <p className="menu-card-description">
              Configure which KPIs to display, customize labels, and reorder them
            </p>
            <div className="menu-card-button">Configure KPIs →</div>
          </div>

          <div className="settings-menu-card" onClick={() => setActiveScreen('colors')}>
            <div className="menu-card-icon">🎨</div>
            <h3 className="menu-card-title">Brand Colors</h3>
            <p className="menu-card-description">
              Customize dashboard colors to match your brand identity
            </p>
            <div className="menu-card-button">Customize Colors →</div>
          </div>

          <div className="settings-menu-card" onClick={() => setActiveScreen('layout')}>
            <div className="menu-card-icon">🔲</div>
            <h3 className="menu-card-title">Dashboard Layout</h3>
            <p className="menu-card-description">
              Arrange and customize your dashboard layout preferences
            </p>
            <div className="menu-card-button">Configure Layout →</div>
          </div>

          <div className="settings-menu-card" onClick={() => setActiveScreen('entities')}>
            <div className="menu-card-icon">🏢</div>
            <h3 className="menu-card-title">Manage Entities</h3>
            <p className="menu-card-description">
              Add, edit, or remove company entities from your dashboard
            </p>
            <div className="menu-card-button">Manage Entities →</div>
          </div>

          <div className="settings-menu-card" style={{opacity: 0.6, cursor: 'not-allowed'}}>
            <div className="menu-card-icon">⚙️</div>
            <h3 className="menu-card-title">General Settings</h3>
            <p className="menu-card-description">
              Manage account preferences and general settings
            </p>
            <div className="menu-card-button">Coming Soon</div>
          </div>
        </div>
      </div>
    );
  }

  // Common header for all screens
  const renderScreenHeader = (title, subtitle) => (
    <div className="settings-header">
      <div>
        <Button 
          onClick={() => setActiveScreen('menu')} 
          variant="outline" 
          size="sm"
          className="back-button"
        >
          ← Back to Settings
        </Button>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="settings-actions">
        {activeScreen !== 'layout' && (
          <Button onClick={resetToDefaults} variant="outline" size="sm" disabled={saving}>
            🔄 Reset to Default
          </Button>
        )}
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Changes'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="settings-container">
      {activeScreen === 'kpis' && (
        <>
          {renderScreenHeader('KPI Configuration', 'Configure which KPIs to display and customize their labels')}
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
                  <div
                    className="color-preview-box"
                    style={{ backgroundColor: preferences[option.key] }}
                    onClick={() => setActiveColorPicker(
                      activeColorPicker === option.key ? null : option.key
                    )}
                  >
                    <span className="color-hex-label">{preferences[option.key]}</span>
                  </div>
                  
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
                          value={preferences[option.key] || '#000000'}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only update if it's a valid hex color format
                            if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                              updateColor(option.key, value);
                            }
                          }}
                          className="color-hex-input"
                          placeholder="#000000"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>



        {/* KPI Configuration Section */}
        <Card className="settings-section">
          <h2 className="section-title">📊 Dashboard KPIs Configuration</h2>
          <p className="section-description">
            Choose which KPIs to display and customize their labels. All enabled KPIs will be shown with equal width across your dashboard.
          </p>

          <div className="kpi-config-list">
            {kpiConfig.map((kpi, index) => (
              <div key={kpi.id} className="kpi-config-item">
                <div className="kpi-config-left">
                  <input 
                    type="checkbox" 
                    checked={kpi.enabled}
                    onChange={() => toggleKpi(kpi.id)}
                    className="kpi-checkbox"
                  />
                  <input
                    type="text"
                    value={kpi.label}
                    onChange={(e) => updateKpiLabel(kpi.id, e.target.value)}
                    className="kpi-label-input"
                    disabled={!kpi.enabled}
                  />
                </div>
                
                <div className="kpi-config-actions">
                  <button 
                    onClick={() => moveKpiUp(kpi.id)}
                    disabled={index === 0}
                    className="kpi-move-btn"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => moveKpiDown(kpi.id)}
                    disabled={index === kpiConfig.length - 1}
                    className="kpi-move-btn"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="kpi-config-info">
            <p>💡 <strong>Tip:</strong> Use the checkboxes to enable/disable KPIs. Customize labels to match your business terminology. Use arrows to reorder.</p>
            <p>📏 <strong>Equal Width:</strong> All enabled KPIs will automatically span equally across the dashboard width for a clean, professional look.</p>
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
          <h3>💡 How It Works</h3>
          <ul>
            <li>🎨 Click any color box to open the color picker</li>
            <li>⚡ Colors update instantly as you pick - preview in real-time!</li>
            <li>💾 Click "Save Preferences" to permanently save your custom theme</li>
            <li>🔄 Use "Reset to Default" to restore the original navy & gold theme</li>
            <li>📱 Your customizations are saved per user account</li>
            <li>🎯 Look at the dashboard header, buttons, and cards to see changes live</li>
          </ul>
        </Card>
            {/* KPI Configuration Screen Content */}
            <Card className="settings-section">
              <h2 className="section-title">📊 Configure KPIs</h2>
              <p className="section-description">
                Choose which KPIs to display and customize their labels. All enabled KPIs will be shown in equal width across your dashboard in a single row.
              </p>

              <div className="kpi-config-list">
                {kpiConfig.map((kpi, index) => (
                  <div key={kpi.id} className="kpi-config-item">
                    <div className="kpi-config-left">
                      <input 
                        type="checkbox" 
                        checked={kpi.enabled}
                        onChange={() => toggleKpi(kpi.id)}
                        className="kpi-checkbox"
                      />
                      <input
                        type="text"
                        value={kpi.label}
                        onChange={(e) => updateKpiLabel(kpi.id, e.target.value)}
                        className="kpi-label-input"
                        disabled={!kpi.enabled}
                      />
                    </div>
                    
                    <div className="kpi-config-actions">
                      <button 
                        onClick={() => moveKpiUp(kpi.id)}
                        disabled={index === 0}
                        className="kpi-move-btn"
                        title="Move left"
                      >
                        ←
                      </button>
                      <button 
                        onClick={() => moveKpiDown(kpi.id)}
                        disabled={index === kpiConfig.length - 1}
                        className="kpi-move-btn"
                        title="Move right"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="kpi-config-info">
                <p>💡 <strong>Tip:</strong> Enable/disable KPIs using checkboxes. Customize labels to match your business terminology.</p>
                <p>↔️ <strong>Reorder:</strong> Use ← → arrows to change the order. KPIs will appear left-to-right in the order shown.</p>
                <p>📏 <strong>Equal Width:</strong> All enabled KPIs will span equally across the dashboard in a single row.</p>
              </div>
            </Card>
          </div>
        </>
      )}

      {activeScreen === 'colors' && (
        <>
          {renderScreenHeader('Brand Colors', 'Customize dashboard colors to match your brand - changes preview in real-time')}
          <div className="settings-content">
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
                      <div
                        className="color-preview-box"
                        style={{ backgroundColor: preferences[option.key] }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveColorPicker(activeColorPicker === option.key ? null : option.key);
                        }}
                      >
                        <span className="color-hex-label">{preferences[option.key]}</span>
                      </div>
                      
                      {activeColorPicker === option.key && (
                        <div className="color-picker-popover">
                          <div 
                            className="color-picker-backdrop" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveColorPicker(null);
                            }} 
                          />
                          <div className="color-picker-content" onClick={(e) => e.stopPropagation()}>
                            <HexColorPicker
                              color={preferences[option.key]}
                              onChange={(color) => updateColor(option.key, color)}
                            />
                            <input
                              type="text"
                              value={preferences[option.key] || '#000000'}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                                  updateColor(option.key, value);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="color-hex-input"
                              placeholder="#000000"
                              maxLength={7}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

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
          </div>
        </>
      )}

      {activeScreen === 'layout' && (
        <>
          {renderScreenHeader('Dashboard Layout', 'Configure your dashboard layout preferences')}
          <div className="settings-content">
            <Card className="settings-section">
              <h2 className="section-title">🔲 Layout Options</h2>
              <p className="section-description">
                Layout customization coming soon
              </p>
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>
                <p>Additional layout options will be available in the next update</p>
              </div>
            </Card>
          </div>
        </>
      )}

      {activeScreen === 'entities' && (
        <>
          {renderScreenHeader('Manage Entities', 'Add, edit, or remove company entities')}
          <div className="settings-content">
            <Card className="settings-section">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="section-title">🏢 Company Entities</h2>
                  <p className="section-description">
                    Manage your company entities and their configurations
                  </p>
                </div>
                <Button onClick={() => setShowAddCompany(!showAddCompany)} variant="default">
                  ➕ Add Entity
                </Button>
              </div>

              {showAddCompany && (
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'white' }}>Add New Entity</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      required
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={newCompany.country}
                      onChange={(e) => setNewCompany({...newCompany, country: e.target.value})}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      required
                    />
                    <select
                      value={newCompany.currency}
                      onChange={(e) => setNewCompany({...newCompany, currency: e.target.value})}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      required
                    >
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <select
                      value={newCompany.company_type}
                      onChange={(e) => setNewCompany({...newCompany, company_type: e.target.value})}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    >
                      <option value="topco">TopCo (Parent)</option>
                      <option value="subsidiary">Subsidiary</option>
                    </select>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <Button type="button" variant="default" onClick={handleAddCompany}>
                      Add Entity
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowAddCompany(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="entities-management-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {companies && companies.length > 0 ? companies.map(company => (
                  <div key={company.id} className="entity-management-card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="entity-info">
                      <span className="entity-name-text" style={{ display: 'block', fontWeight: '600', fontSize: '1.1rem', color: '#000', marginBottom: '0.25rem' }}>{company.name}</span>
                      <span className="entity-details" style={{ color: '#666', fontSize: '0.875rem' }}>{company.country} • {company.currency}</span>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => onDeleteEntity(company.id, company.name)}
                      data-testid={`delete-entity-${company.id}`}
                    >
                      🗑️ Remove
                    </Button>
                  </div>
                )) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#666', gridColumn: '1 / -1' }}>
                    <p>No entities yet. Add your first entity to get started.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;
