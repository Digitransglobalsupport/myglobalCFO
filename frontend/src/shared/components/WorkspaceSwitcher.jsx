/**
 * WorkspaceSwitcher - UI component for switching between workspaces
 * 
 * Features:
 * - Dropdown to select workspace
 * - Shows current workspace name
 * - Visual indicator when syncing
 * - Badge showing workspace type (internal/client)
 * 
 * Usage:
 *   import { WorkspaceSwitcher } from '@/shared/components/WorkspaceSwitcher';
 *   <WorkspaceSwitcher />
 */

import React, { useState } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  RefreshCcw,
  Users,
  Briefcase
} from 'lucide-react';

// Shadcn imports - adjust path based on your project
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export const WorkspaceSwitcher = ({ 
  showOrgName = true,
  showCreateButton = false,
  onCreateWorkspace,
  className = ''
}) => {
  const {
    workspaces,
    activeWorkspace,
    activeOrg,
    isSyncing,
    loading,
    switchWorkspace,
    appId
  } = useWorkspace();
  
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSwitch = async (workspaceId) => {
    if (workspaceId === activeWorkspace?.id) {
      setIsOpen(false);
      return;
    }
    
    const result = await switchWorkspace(workspaceId);
    
    if (result.success) {
      toast.success(`Switched to ${result.workspace?.name || 'workspace'}`);
      setIsOpen(false);
      
      // Optional: Force page reload for clean state
      // window.location.reload();
    } else {
      toast.error(result.error || 'Failed to switch workspace');
    }
  };
  
  const getWorkspaceIcon = (workspace) => {
    if (workspace.type === 'client') {
      return <Briefcase className="w-4 h-4 text-blue-400" />;
    }
    return <Building2 className="w-4 h-4 text-gray-400" />;
  };
  
  const getWorkspaceBadge = (workspace) => {
    if (workspace.type === 'client') {
      return (
        <Badge variant="outline" className="ml-2 text-xs border-blue-500/30 text-blue-400">
          Client
        </Badge>
      );
    }
    if (workspace.is_default) {
      return (
        <Badge variant="outline" className="ml-2 text-xs border-gray-500/30 text-gray-400">
          Default
        </Badge>
      );
    }
    return null;
  };
  
  if (loading) {
    return (
      <Button 
        variant="outline" 
        className={`border-slate-600 text-gray-400 ${className}`}
        disabled
      >
        <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }
  
  // No workspaces - might be legacy user
  if (workspaces.length === 0) {
    return (
      <Button 
        variant="outline" 
        className={`border-slate-600 text-gray-400 ${className}`}
        disabled
      >
        <Building2 className="w-4 h-4 mr-2" />
        No Workspaces
      </Button>
    );
  }
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`border-slate-600 text-white hover:bg-slate-700 ${className}`}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Building2 className="w-4 h-4 mr-2" />
          )}
          <span className="max-w-[150px] truncate">
            {activeWorkspace?.name || 'Select Workspace'}
          </span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-64 bg-slate-800 border-slate-700"
        align="start"
      >
        {/* Organization Header */}
        {showOrgName && activeOrg && (
          <>
            <DropdownMenuLabel className="text-gray-400 text-xs font-normal">
              <Users className="w-3 h-3 inline mr-1" />
              {activeOrg.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
          </>
        )}
        
        {/* Workspace List */}
        <DropdownMenuLabel className="text-gray-400 text-xs">
          Workspaces
        </DropdownMenuLabel>
        
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            className={`
              cursor-pointer text-white hover:bg-slate-700 focus:bg-slate-700
              ${workspace.id === activeWorkspace?.id ? 'bg-slate-700/50' : ''}
            `}
            onClick={() => handleSwitch(workspace.id)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                {getWorkspaceIcon(workspace)}
                <span className="ml-2 truncate max-w-[140px]">
                  {workspace.name}
                </span>
                {getWorkspaceBadge(workspace)}
              </div>
              {workspace.id === activeWorkspace?.id && (
                <Check className="w-4 h-4 text-green-400" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        {/* Create Workspace Button */}
        {showCreateButton && (
          <>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              className="cursor-pointer text-blue-400 hover:bg-slate-700 focus:bg-slate-700"
              onClick={() => {
                setIsOpen(false);
                onCreateWorkspace?.();
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Workspace
            </DropdownMenuItem>
          </>
        )}
        
        {/* Footer with app info */}
        <DropdownMenuSeparator className="bg-slate-700" />
        <div className="px-2 py-1 text-xs text-gray-500">
          App: {appId}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Compact version for sidebars
 */
export const WorkspaceSwitcherCompact = ({ className = '' }) => {
  const { activeWorkspace, isSyncing, switchWorkspace, workspaces } = useWorkspace();
  
  if (!activeWorkspace) return null;
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isSyncing ? (
        <RefreshCcw className="w-4 h-4 text-blue-400 animate-spin" />
      ) : (
        <Building2 className="w-4 h-4 text-gray-400" />
      )}
      <span className="text-sm text-white truncate max-w-[120px]">
        {activeWorkspace.name}
      </span>
      {workspaces.length > 1 && (
        <Badge variant="outline" className="text-xs border-slate-600 text-gray-400">
          {workspaces.length}
        </Badge>
      )}
    </div>
  );
};

/**
 * Workspace sync indicator - shows when syncing across tabs
 */
export const WorkspaceSyncIndicator = () => {
  const { isSyncing } = useWorkspace();
  
  if (!isSyncing) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-blue-500/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
      <RefreshCcw className="w-4 h-4 animate-spin" />
      <span className="text-sm">Syncing workspace...</span>
    </div>
  );
};

export default WorkspaceSwitcher;
