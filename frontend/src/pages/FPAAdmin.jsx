import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { API } from '@/App';
import { ArrowLeft, Shield, Users, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const FPAAdmin = ({ user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [entities, setEntities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    role: 'contributor',
    entity_ids: [],
    department_ids: [],
    account_category_access: [],
    can_create_versions: false,
    can_edit_drivers: false,
    can_create_formulas: false,
    can_lock_versions: false,
    can_manage_users: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes, entitiesRes, departmentsRes] = await Promise.all([
        axios.get(`${API}/fpa/admin/users`),
        axios.get(`${API}/fpa/admin/roles`),
        axios.get(`${API}/fpa/dimensions/entities`),
        axios.get(`${API}/fpa/dimensions/departments`)
      ]);

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setEntities(entitiesRes.data);
      setDepartments(departmentsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load user data');
      setLoading(false);
    }
  };

  const handleEditUser = (userData) => {
    setEditingUser(userData);
    
    const permission = userData.fpa_permission || {};
    setPermissionForm({
      role: permission.role || 'contributor',
      entity_ids: permission.entity_ids || [],
      department_ids: permission.department_ids || [],
      account_category_access: permission.account_category_access || [],
      can_create_versions: permission.can_create_versions || false,
      can_edit_drivers: permission.can_edit_drivers || false,
      can_create_formulas: permission.can_create_formulas || false,
      can_lock_versions: permission.can_lock_versions || false,
      can_manage_users: permission.can_manage_users || false
    });
    
    setShowEditDialog(true);
  };

  const handleRoleChange = (roleValue) => {
    const selectedRole = roles.find(r => r.value === roleValue);
    
    if (selectedRole) {
      setPermissionForm({
        ...permissionForm,
        role: roleValue,
        ...selectedRole.permissions
      });
    }
  };

  const handleSavePermission = async () => {
    if (!editingUser) return;

    try {
      console.log('Saving permission with data:', {
        user_id: editingUser.id,
        ...permissionForm
      });
      
      const response = await axios.post(`${API}/fpa/admin/permissions`, {
        user_id: editingUser.id,
        ...permissionForm
      });

      console.log('Permission save response:', response.data);
      toast.success('User permissions updated successfully');
      setShowEditDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving permission:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to update permissions: ${error.response?.data?.detail || error.message}`);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      'cfo_admin': <Badge className="bg-purple-500">CFO Admin</Badge>,
      'finance_analyst': <Badge className="bg-blue-500">Finance Analyst</Badge>,
      'department_manager': <Badge className="bg-green-500">Dept Manager</Badge>,
      'executive_viewer': <Badge className="bg-orange-500">Executive Viewer</Badge>,
      'contributor': <Badge variant="outline">Contributor</Badge>
    };
    return badges[role] || <Badge>{role}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/fpa-dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">User Permissions</h1>
                <p className="text-sm text-slate-600">Manage FP&A access and roles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {roles.slice(0, 3).map((role) => (
            <Card key={role.value} className="p-4 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">{role.label}</h3>
              </div>
              <p className="text-sm text-slate-600">{role.description}</p>
            </Card>
          ))}
        </div>

        {/* Users List */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Users ({users.length})</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-700">User</th>
                  <th className="text-left p-3 font-medium text-slate-700">Email</th>
                  <th className="text-left p-3 font-medium text-slate-700">FP&A Role</th>
                  <th className="text-left p-3 font-medium text-slate-700">Permissions</th>
                  <th className="text-center p-3 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userData) => {
                  const permission = userData.fpa_permission;
                  const hasPermissions = permission && 
                    (permission.can_create_versions || 
                     permission.can_edit_drivers || 
                     permission.can_create_formulas);

                  return (
                    <tr key={userData.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-medium text-slate-900">{userData.name || 'User'}</span>
                      </td>
                      <td className="p-3 text-slate-700">{userData.email}</td>
                      <td className="p-3">
                        {permission ? getRoleBadge(permission.role) : <Badge variant="outline">No Role</Badge>}
                      </td>
                      <td className="p-3">
                        {hasPermissions ? (
                          <div className="flex flex-wrap gap-1">
                            {permission.can_create_versions && (
                              <Badge variant="outline" className="text-xs">Versions</Badge>
                            )}
                            {permission.can_edit_drivers && (
                              <Badge variant="outline" className="text-xs">Drivers</Badge>
                            )}
                            {permission.can_create_formulas && (
                              <Badge variant="outline" className="text-xs">Formulas</Badge>
                            )}
                            {permission.can_lock_versions && (
                              <Badge variant="outline" className="text-xs">Lock</Badge>
                            )}
                            {permission.can_manage_users && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">No permissions</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditUser(userData)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Permission Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit FP&A Permissions</DialogTitle>
            </DialogHeader>
            
            {editingUser && (
              <div className="space-y-6 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">User: {editingUser.name}</p>
                  <p className="text-xs text-slate-600">{editingUser.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900" style={{color: '#1e293b'}}>FP&A Role</label>
                  <Select value={permissionForm.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-600 mt-1">
                    {roles.find(r => r.value === permissionForm.role)?.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-bold text-black">Specific Permissions</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="can_create_versions"
                        checked={permissionForm.can_create_versions}
                        onChange={(e) => setPermissionForm({...permissionForm, can_create_versions: e.target.checked})}
                        className="rounded"
                      />
                      <div className="text-sm font-medium text-black cursor-pointer" onClick={() => document.getElementById('can_create_versions').click()}>
                        Create Versions
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="can_edit_drivers"
                        checked={permissionForm.can_edit_drivers}
                        onChange={(e) => setPermissionForm({...permissionForm, can_edit_drivers: e.target.checked})}
                        className="rounded"
                      />
                      <div className="text-sm font-medium text-black cursor-pointer" onClick={() => document.getElementById('can_edit_drivers').click()}>
                        Edit Drivers
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="can_create_formulas"
                        checked={permissionForm.can_create_formulas}
                        onChange={(e) => setPermissionForm({...permissionForm, can_create_formulas: e.target.checked})}
                        className="rounded"
                      />
                      <div className="text-sm font-medium text-black cursor-pointer" onClick={() => document.getElementById('can_create_formulas').click()}>
                        Create Formulas
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="can_lock_versions"
                        checked={permissionForm.can_lock_versions}
                        onChange={(e) => setPermissionForm({...permissionForm, can_lock_versions: e.target.checked})}
                        className="rounded"
                      />
                      <div className="text-sm font-medium text-black cursor-pointer" onClick={() => document.getElementById('can_lock_versions').click()}>
                        Lock Versions
                      </div>
                    </div>

                    <div className="flex items-center gap-3 col-span-2">
                      <input
                        type="checkbox"
                        id="can_manage_users"
                        checked={permissionForm.can_manage_users}
                        onChange={(e) => setPermissionForm({...permissionForm, can_manage_users: e.target.checked})}
                        className="rounded"
                      />
                      <div className="text-sm font-medium text-black cursor-pointer" onClick={() => document.getElementById('can_manage_users').click()}>
                        Manage Users (Admin)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSavePermission}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Permissions
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FPAAdmin;
