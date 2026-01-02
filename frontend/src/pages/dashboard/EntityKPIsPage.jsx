import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOutletContext } from 'react-router-dom';

const EntityKPIsPage = () => {
  const {
    entityComparison,
    companies,
    loadEntityComparison,
    setEntityDetailsDialog,
    formatCurrency
  } = useOutletContext();
  return (
    <Card className="content-card">
      <div className="card-header">
        <h2>Real-Time Entity Performance KPIs</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button onClick={loadEntityComparison} variant="outline" size="sm" data-testid="refresh-kpis-btn">
            🔄 Refresh KPIs
          </Button>
        </div>
      </div>
      
      {entityComparison && (
        <div className="entity-kpis-section">
          {/* Group Totals Summary */}
          {entityComparison.group_totals && companies.length > 1 && (
            <div className="group-summary">
              <h3>Group Performance Summary</h3>
              <div className="group-metrics">
                <div className="metric-box">
                  <span className="metric-label">Total Revenue</span>
                  <span className="metric-value">{formatCurrency(entityComparison.group_totals.revenue)}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Total EBITDA</span>
                  <span className="metric-value">{formatCurrency(entityComparison.group_totals.ebitda)}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Group Margin</span>
                  <span className="metric-value">{entityComparison.group_totals.ebitda_margin}%</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Total Cash</span>
                  <span className="metric-value">{formatCurrency(entityComparison.group_totals.cash)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Individual Entity KPIs */}
          <div className="entities-kpi-grid">
            {entityComparison.entities.map(entity => (
              <div key={entity.entity_id} className={`entity-kpi-card status-${entity.status}`} data-testid="entity-kpi-card">
                <div className="entity-kpi-header">
                  <h3>{entity.entity_name}</h3>
                  <Badge className={`status-badge ${entity.status}`}>
                    {entity.status === 'healthy' ? '✅ Healthy' : 
                     entity.status === 'warning' ? '⚠️ Warning' : 
                     '🔴 Critical'}
                  </Badge>
                </div>
                
                <div className="entity-kpi-metrics">
                  <div className="kpi-row">
                    <span className="kpi-metric-label">Revenue</span>
                    <span className="kpi-metric-value">{formatCurrency(entity.revenue, entity.currency)}</span>
                  </div>
                  
                  <div className="kpi-row">
                    <span className="kpi-metric-label">EBITDA</span>
                    <span className="kpi-metric-value">{formatCurrency(entity.ebitda, entity.currency)}</span>
                  </div>
                  
                  <div className="kpi-row">
                    <span className="kpi-metric-label">EBITDA Margin</span>
                    <span className={`kpi-metric-value ${entity.ebitda_margin > 20 ? 'positive' : entity.ebitda_margin > 10 ? 'warning' : 'negative'}`}>
                      {entity.ebitda_margin}%
                    </span>
                  </div>
                  
                  <div className="kpi-row">
                    <span className="kpi-metric-label">Revenue Growth</span>
                    <span className={`kpi-metric-value ${entity.revenue_growth > 0 ? 'positive' : 'negative'}`}>
                      {entity.revenue_growth > 0 ? '+' : ''}{entity.revenue_growth}%
                    </span>
                  </div>
                  
                  <div className="kpi-row">
                    <span className="kpi-metric-label">Cash Balance</span>
                    <span className="kpi-metric-value">{formatCurrency(entity.cash_balance, entity.currency)}</span>
                  </div>
                  
                  <div className="kpi-row">
                    <span className="kpi-metric-label">Runway</span>
                    <span className={`kpi-metric-value ${entity.runway_days > 180 ? 'positive' : entity.runway_days > 90 ? 'warning' : 'negative'}`}>
                      {entity.runway_days} days
                    </span>
                  </div>
                  
                  <div className="kpi-row">
                    <span className="kpi-metric-label">Monthly Burn Rate</span>
                    <span className="kpi-metric-value">{formatCurrency(entity.burn_rate, entity.currency)}</span>
                  </div>
                  
                  <div className="kpi-row">
                    <span className="kpi-metric-label">Quick Ratio</span>
                    <span className={`kpi-metric-value ${entity.quick_ratio > 2 ? 'positive' : entity.quick_ratio > 1 ? 'warning' : 'negative'}`}>
                      {entity.quick_ratio.toFixed(2)}x
                    </span>
                  </div>
                </div>
                
                <div className="entity-kpi-actions">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEntityDetailsDialog(entity)}
                    data-testid="view-entity-details"
                  >
                    📊 View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!entityComparison && (
        <div className="empty-message">
          <p>Click "Refresh KPIs" to load real-time entity performance metrics</p>
        </div>
      )}
    </Card>
  );
};

export default EntityKPIsPage;
