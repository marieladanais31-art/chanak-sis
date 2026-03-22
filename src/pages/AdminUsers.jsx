import React, { useState, useEffect } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Pencil, Trash2, ShieldAlert, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AdminUsers = () => {
  const { users, loading, createUser, updateUser, deleteUser } = useUserManagement();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Create Form State
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('student');
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal State
  const [editUser, setEditUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Dialog State
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite/Reset Cooldown State
  const [sendingInviteFor, setSendingInviteFor] = useState(null);
  const [cooldowns, setCooldowns] = useState({});

  useEffect(() => {
    // Timer to update cooldowns
    const timer = setInterval(() => {
      setCooldowns(current => {
        const next = {};
        let changed = false;
        Object.entries(current).forEach(([userId, timeLeft]) => {
          if (timeLeft > 0) {
            next[userId] = timeLeft - 1;
            changed = true;
          }
        });
        return changed ? next : current;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handlers
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createEmail || !createName) return;

    setIsCreating(true);
    const success = await createUser(createEmail, createName, createRole);
    setIsCreating(false);

    if (success) {
      setCreateEmail('');
      setCreateName('');
      setCreateRole('student');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editUser) return;

    setIsUpdating(true);
    const success = await updateUser(editUser.id, editUser.full_name, editUser.role);
    setIsUpdating(false);

    if (success) {
      setIsEditDialogOpen(false);
      setEditUser(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    
    setIsDeleting(true);
    await deleteUser(deleteUserId);
    setIsDeleting(false);
    setDeleteUserId(null);
  };

  const handleSendInvite = async (user) => {
    if (cooldowns[user.id] > 0) return;

    setSendingInviteFor(user.id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'https://sis.chanakacademy.org/auth/callback'
      });

      if (error) {
         if (error.status === 429) {
            throw new Error("Too many requests. Please wait before retrying.");
         }
         throw error;
      }

      toast({
        title: "Invite Sent",
        description: `Password creation link sent to ${user.email}`,
      });

      // Start 60s cooldown for this user
      setCooldowns(prev => ({ ...prev, [user.id]: 60 }));

    } catch (err) {
      toast({
        title: "Failed to send invite",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSendingInviteFor(null);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-white/60">Create and manage system users and roles</p>
        </div>
      </div>

      {/* Create User Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
          <CardDescription>Add a new user to the system. They will receive access immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="user@chanak.edu"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="student">Student</option>
                <option value="parent">Parent</option>
                <option value="tutor">Tutor</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={isCreating} className="bg-[#2F80ED]">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create User
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name || `${user.first_name || ''} ${user.last_name || ''}`}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 
                            user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'tutor' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'}`}>
                          {user.role?.replace('_', ' ') || 'User'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                         {isSuperAdmin && (
                           <Button
                             variant="outline"
                             size="icon"
                             title="Send Password Creation Link"
                             onClick={() => handleSendInvite(user)}
                             disabled={!!cooldowns[user.id] || sendingInviteFor === user.id}
                           >
                             {sendingInviteFor === user.id ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : cooldowns[user.id] > 0 ? (
                               <span className="text-[10px] font-bold">{cooldowns[user.id]}</span>
                             ) : (
                               <Key className="h-4 w-4" />
                             )}
                           </Button>
                         )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteUserId(user.id)}
                          disabled={currentUser?.id === user.id} // Prevent self-delete
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update details for {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editUser.email} disabled className="bg-gray-100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input 
                  id="edit-name" 
                  value={editUser.full_name || ''} 
                  onChange={(e) => setEditUser({...editUser, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  value={editUser.role || 'student'}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="tutor">Tutor</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will remove their access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;