import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOutletContext } from 'react-router-dom';

const TransactionsPage = () => {
  const {
    transactions,
    sortConfig,
    filters,
    useMockedData,
    selectedCurrency,
    handleSort,
    handleFilterChange,
    getFilteredAndSortedTransactions,
    clearFilters,
    handleSeedData,
    handleClearData,
    formatCurrency,
    getStatusColor
  } = useOutletContext();
  
  const filteredTransactions = getFilteredAndSortedTransactions();
  const showEmptyState = !useMockedData && filteredTransactions.length === 0;
  
  return (
    <Card className="content-card">
      <div className="card-header">
        <h2>Recent Transactions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button onClick={clearFilters} variant="outline" size="sm" data-testid="clear-filters-btn">
            🔄 Clear Filters
          </Button>
          <Button onClick={handleSeedData} variant="outline" size="sm" data-testid="seed-data-btn">
            Generate Demo Data
          </Button>
          <Button onClick={handleClearData} variant="destructive" size="sm" data-testid="clear-data-btn">
            🗑️ Clear All Data
          </Button>
        </div>
      </div>
      
      {showEmptyState ? (
        <div style={{padding: '3rem', textAlign: 'center'}}>
          <p style={{color: 'var(--gray-400)', fontSize: '1.1rem', marginBottom: '1rem'}}>
            📭 No transactions found
          </p>
          <p style={{color: 'var(--gray-500)', fontSize: '0.9rem'}}>
            Toggle Mock ON or import transactions to see data here
          </p>
        </div>
      ) : (
      <div className="transactions-table">
        <table>
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('date')}>
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Description</th>
              <th>Type</th>
              <th>Category</th>
              <th className="sortable-header" onClick={() => handleSort('amount')}>
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Source</th>
              <th>Status</th>
            </tr>
            <tr className="filter-row">
              <td>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="filter-input"
                  data-testid="filter-date"
                  title="Filter by specific date"
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.description}
                  onChange={(e) => handleFilterChange('description', e.target.value)}
                  className="filter-input"
                  data-testid="filter-description"
                />
              </td>
              <td>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="filter-select"
                  data-testid="filter-type"
                >
                  <option value="">All</option>
                  <option value="invoice">Invoice</option>
                  <option value="bill">Bill</option>
                  <option value="bank_transaction">Bank Transaction</option>
                  <option value="journal_entry">Journal Entry</option>
                </select>
              </td>
              <td>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-select"
                  data-testid="filter-category"
                >
                  <option value="">All</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Technology">Technology</option>
                  <option value="Administration">Administration</option>
                </select>
              </td>
              <td></td>
              <td>
                <select
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="filter-select"
                  data-testid="filter-source"
                >
                  <option value="">All</option>
                  <option value="email">Email</option>
                  <option value="xero">Xero</option>
                  <option value="truelayer">TrueLayer</option>
                  <option value="manual">Manual</option>
                </select>
              </td>
              <td>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="filter-select"
                  data-testid="filter-status"
                >
                  <option value="">All</option>
                  <option value="matched">Matched</option>
                  <option value="pending">Pending</option>
                  <option value="unmatched">Unmatched</option>
                </select>
              </td>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(trans => (
              <tr key={trans.id} data-testid="transaction-row">
                <td>{trans.date}</td>
                <td>{trans.description}</td>
                <td><Badge variant="outline">{trans.type}</Badge></td>
                <td>{trans.category}</td>
                <td className="amount">{formatCurrency(trans.amount, selectedCurrency)}</td>
                <td><Badge variant="secondary">{trans.source}</Badge></td>
                <td>
                  <Badge className={getStatusColor(trans.reconciliation_status)}>
                    {trans.reconciliation_status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTransactions.length === 0 && !showEmptyState && (
          <div className="empty-table">
            <p>No transactions match your filters. Try adjusting the filters or click "Clear Filters".</p>
          </div>
        )}
      </div>
      )}
    </Card>
  );
};

export default TransactionsPage;
