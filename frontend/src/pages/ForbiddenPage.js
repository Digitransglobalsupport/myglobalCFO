import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ForbiddenPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" data-testid="forbidden-page">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-12 h-12 text-red-400" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4">403</h1>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Access Forbidden</h2>
        <p className="text-gray-400 mb-8">
          You don't have permission to access this page. This area is restricted to administrators only.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="border-slate-600 text-gray-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
