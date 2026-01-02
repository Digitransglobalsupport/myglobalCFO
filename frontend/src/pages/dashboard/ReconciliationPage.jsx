import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOutletContext } from 'react-router-dom';

const ReconciliationPage = () => {
  const { transactions, useMockedData, handleAutoReconcile } = useOutletContext();
  
  const showEmptyState = !useMockedData && transactions.length === 0;
  
  return (
    <Card className="content-card">
      <div className="card-header">
        <h2>Bank Reconciliation</h2>
        <Button onClick={handleAutoReconcile} data-testid="auto-reconcile-btn">
          🔄 Auto-Reconcile
        </Button>
      </div>
      
      {showEmptyState ? (
        <div style={{padding: '3rem', textAlign: 'center'}}>
          <p style={{color: 'var(--gray-400)', fontSize: '1.1rem', marginBottom: '1rem'}}>
            📭 No transactions to reconcile
          </p>
          <p style={{color: 'var(--gray-500)', fontSize: '0.9rem'}}>
            Toggle Mock ON or import transactions to use reconciliation
          </p>
        </div>
      ) : (
      <div className="reconciliation-status">
        <div className="status-card matched">
          <h3>Matched</h3>
          <p className="status-count">{transactions.filter(t => t.reconciliation_status === 'matched').length}</p>
        </div>
        <div className="status-card pending">
          <h3>Pending</h3>
          <p className="status-count">{transactions.filter(t => t.reconciliation_status === 'pending').length}</p>
        </div>
        <div className="status-card unmatched">
          <h3>Unmatched</h3>
          <p className="status-count">{transactions.filter(t => t.reconciliation_status === 'unmatched').length}</p>
        </div>
      </div>
      )}
    </Card>
  );
};

export default ReconciliationPage;
