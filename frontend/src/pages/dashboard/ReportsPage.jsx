import { Card } from '@/components/ui/card';
import { useOutletContext } from 'react-router-dom';

const ReportsPage = () => {
  const { dashboardData, formatCurrency } = useOutletContext();
  return (
    <Card className="content-card">
      <h2>Financial Reports</h2>
      
      {dashboardData && (
        <div className="reports-grid">
          <div className="report-section">
            <h3>AR Aging Analysis</h3>
            <div className="aging-breakdown">
              <div className="aging-item">
                <span>Current:</span>
                <strong>{formatCurrency(dashboardData.ar_aging.current)}</strong>
              </div>
              <div className="aging-item">
                <span>30 Days:</span>
                <strong>{formatCurrency(dashboardData.ar_aging['30_days'])}</strong>
              </div>
              <div className="aging-item">
                <span>60 Days:</span>
                <strong>{formatCurrency(dashboardData.ar_aging['60_days'])}</strong>
              </div>
              <div className="aging-item">
                <span>90+ Days:</span>
                <strong>{formatCurrency(dashboardData.ar_aging['90_plus'])}</strong>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h3>Cost Center Breakdown</h3>
            <div className="cost-center-list">
              {dashboardData.top_cost_centers.map((cc, idx) => (
                <div key={idx} className="cost-center-item">
                  <span>{cc.name}</span>
                  <strong>{formatCurrency(cc.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ReportsPage;
