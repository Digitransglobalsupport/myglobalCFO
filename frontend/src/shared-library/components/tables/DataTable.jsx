/**
 * DataTable - Reusable data table component
 * 
 * Features:
 * - Sortable columns
 * - Pagination
 * - Row selection
 * - Loading state
 * - Empty state
 * 
 * Usage:
 *   <DataTable
 *     columns={[
 *       { key: 'name', header: 'Name', sortable: true },
 *       { key: 'amount', header: 'Amount', format: 'currency' }
 *     ]}
 *     data={transactions}
 *     onRowClick={(row) => console.log(row)}
 *   />
 */

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Format cell value
const formatCellValue = (value, format, options = {}) => {
  if (value === null || value === undefined) return '—';
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: options.currency || 'USD'
      }).format(value);
      
    case 'date':
      return new Date(value).toLocaleDateString();
      
    case 'datetime':
      return new Date(value).toLocaleString();
      
    case 'percent':
      return `${(value * 100).toFixed(options.decimals || 1)}%`;
      
    case 'boolean':
      return value ? '✓' : '✗';
      
    default:
      return String(value);
  }
};

export const DataTable = ({
  columns,
  data = [],
  loading = false,
  pageSize = 10,
  selectable = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  onRowClick = null,
  onSelectionChange = null,
  emptyMessage = 'No data available',
  className = ''
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(row => 
      columns.some(col => {
        const value = row[col.key];
        return value && String(value).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, columns]);
  
  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);
  
  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);
  
  const totalPages = Math.ceil(sortedData.length / pageSize);
  
  // Handle sort
  const handleSort = (column) => {
    if (!column.sortable) return;
    
    if (sortColumn === column.key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };
  
  // Handle selection
  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelection = new Set(paginatedData.map(row => row.id));
      setSelectedRows(newSelection);
      onSelectionChange?.(Array.from(newSelection));
    }
  };
  
  const handleSelectRow = (rowId) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };
  
  // Render sort icon
  const renderSortIcon = (column) => {
    if (!column.sortable) return null;
    
    if (sortColumn !== column.key) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-500" />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-400" />
      : <ChevronDown className="w-4 h-4 text-blue-400" />;
  };
  
  // Loading state
  if (loading) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}>
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-10 bg-slate-700 rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}>
      {/* Search */}
      {searchable && (
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="pl-10 bg-slate-900 border-slate-600 text-white"
            />
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              {selectable && (
                <th className="p-4 text-left">
                  <Checkbox
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`p-4 text-left text-sm font-medium text-gray-400 ${
                    column.sortable ? 'cursor-pointer hover:text-white' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="p-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`
                    border-b border-slate-700/50 
                    ${onRowClick ? 'cursor-pointer hover:bg-slate-700/50' : ''}
                    ${selectedRows.has(row.id) ? 'bg-blue-500/10' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onCheckedChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td key={column.key} className="p-4 text-white">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : formatCellValue(row[column.key], column.format, column.formatOptions)
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="border-slate-600 text-white"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="border-slate-600 text-white"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
