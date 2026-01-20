import React from 'react';
import { Wrench, Clock } from 'lucide-react';

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6" data-testid="maintenance-page">
      <div className="text-center max-w-lg">
        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Wrench className="w-12 h-12 text-amber-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">System Under Maintenance</h1>
        
        <p className="text-gray-400 mb-6 leading-relaxed">
          We're currently performing scheduled maintenance to improve your experience. 
          Please check back shortly.
        </p>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-gray-300 mb-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="font-medium">Expected Duration</span>
          </div>
          <p className="text-gray-400 text-sm">
            We'll be back online as soon as possible. Thank you for your patience.
          </p>
        </div>
        
        <div className="flex items-center justify-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
            alt="Digitrans Global" 
            className="h-12 w-auto opacity-50"
          />
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
