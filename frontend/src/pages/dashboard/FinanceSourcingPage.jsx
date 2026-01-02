import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOutletContext } from 'react-router-dom';

const FinanceSourcingPage = () => {
  const { financeOptions, loadFinanceOptions } = useOutletContext();
  return (
    <Card className="content-card">
      <div className="card-header">
        <h2>Finance Sourcing Recommendations</h2>
        <Button onClick={loadFinanceOptions} variant="outline" size="sm" data-testid="load-finance-btn">
          🔍 Search Options
        </Button>
      </div>
      
      <div className="finance-options">
        {financeOptions.map(option => (
          <div key={option.id} className="finance-option-card" data-testid="finance-option">
            <div className="option-header">
              <Badge>{option.type}</Badge>
              <h3>{option.provider}</h3>
            </div>
            <div className="option-details">
              {option.interest_rate && (
                <div className="detail-item">
                  <span>Interest Rate:</span>
                  <strong>{option.interest_rate}%</strong>
                </div>
              )}
              <div className="detail-item">
                <span>Amount Range:</span>
                <strong>{option.amount_range}</strong>
              </div>
              <div className="detail-item">
                <span>Eligibility:</span>
                <strong>{option.eligibility}</strong>
              </div>
            </div>
            <a href={option.source_url} target="_blank" rel="noopener noreferrer" className="option-link">
              View Details →
            </a>
          </div>
        ))}
        
        {financeOptions.length === 0 && (
          <p className="empty-message">Click "Search Options" to find finance opportunities</p>
        )}
      </div>
    </Card>
  );
};

export default FinanceSourcingPage;
