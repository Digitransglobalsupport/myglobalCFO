import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

const OcrUploadDialog = ({ open, onClose, onUploadSuccess, companies }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [category, setCategory] = useState('');
  
  // Editable extracted fields
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
      uploadFile(selectedFile);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const uploadFile = async (fileToUpload) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const token = localStorage.getItem('cfo_token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

      const response = await fetch(`${backendUrl}/api/ocr/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setExtractedData(data.extracted_data);
      setDraftId(data.id);
      
      // Show error if OCR processing failed
      if (data.error) {
        setUploadError(data.error);
      }
      
      // Pre-fill all extracted fields for editing
      if (data.extracted_data) {
        setVendor(data.extracted_data.vendor || '');
        setAmount(data.extracted_data.amount || '');
        setCurrency(data.extracted_data.currency || 'USD');
        setDate(data.extracted_data.date || '');
        setDescription(data.extracted_data.description || '');
        setInvoiceNumber(data.extracted_data.invoice_number || '');
        setCostCenter(data.extracted_data.suggested_cost_center || '');
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCompany) {
      setUploadError('Please select a company');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const token = localStorage.getItem('cfo_token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

      // First update the draft with edited data
      const updateResponse = await fetch(`${backendUrl}/api/ocr/drafts/${draftId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extracted_data: {
            vendor: vendor,
            amount: parseFloat(amount) || 0,
            currency: currency,
            date: date,
            description: description,
            invoice_number: invoiceNumber,
            suggested_cost_center: costCenter,
            line_items: extractedData?.line_items || [],
            tax_amount: extractedData?.tax_amount,
            subtotal: extractedData?.subtotal,
            payment_method: extractedData?.payment_method
          }
        })
      });

      if (!updateResponse.ok) {
        console.error('Failed to update draft with edited data');
      }

      // Then approve the draft
      const response = await fetch(`${backendUrl}/api/ocr/drafts/${draftId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: selectedCompany,
          cost_center: costCenter,
          category: category || 'Uncategorized'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Approval failed');
      }

      const data = await response.json();
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }

      // Reset and close
      handleClose();
      
    } catch (error) {
      console.error('Approval error:', error);
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setExtractedData(null);
    setDraftId(null);
    setSelectedCompany('');
    setCostCenter('');
    setCategory('');
    setVendor('');
    setAmount('');
    setCurrency('USD');
    setDate('');
    setDescription('');
    setInvoiceNumber('');
    setUploadError(null);
    setIsDragging(false);
    onClose();
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Receipt / Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!extractedData ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-600">Processing receipt...</p>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      Select File
                    </Button>
                    <p className="mt-2 text-sm text-gray-600">
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, PNG, JPG, HEIC up to 10MB
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    Data extracted successfully - Review and edit if needed
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Extracted Data (Editable)</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vendor" className="text-xs text-gray-600">Vendor *</Label>
                    <Input
                      id="vendor"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="Vendor name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="invoiceNumber" className="text-xs text-gray-600">Invoice #</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Invoice number"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="amount" className="text-xs text-gray-600">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="currency" className="text-xs text-gray-600">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="date" className="text-xs text-gray-600">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-xs text-gray-600">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Transaction description"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>

              {extractedData.line_items && extractedData.line_items.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Line Items (from OCR)</Label>
                  <div className="bg-white border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {extractedData.line_items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm">{item.description}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.quantity || '-'}</td>
                            <td className="px-3 py-2 text-sm text-right">
                              {item.unit_price ? formatCurrency(item.unit_price, currency) : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-right font-medium">
                              {formatCurrency(item.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {extractedData.subtotal && (
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      Subtotal: {formatCurrency(extractedData.subtotal, currency)} 
                      {extractedData.tax_amount && ` | Tax: ${formatCurrency(extractedData.tax_amount, currency)}`}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700">Transaction Details</h3>
                
                <div>
                  <Label htmlFor="company" className="text-xs text-gray-600">Company *</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger id="company" className="mt-1">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies && companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="costCenter" className="text-xs text-gray-600">Cost Center</Label>
                  <Input
                    id="costCenter"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="e.g., Office Supplies, Travel, Marketing"
                    className="mt-1"
                  />
                  {extractedData?.suggested_cost_center && costCenter === extractedData.suggested_cost_center && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✓ AI suggested: {extractedData.suggested_cost_center}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category" className="text-xs text-gray-600">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Expense, COGS"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          {extractedData && (
            <Button onClick={handleApprove} disabled={isUploading || !selectedCompany}>
              {isUploading ? 'Approving...' : 'Approve & Create Transaction'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OcrUploadDialog;
