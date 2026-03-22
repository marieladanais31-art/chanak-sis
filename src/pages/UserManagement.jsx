import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Search, Plus, Edit, Trash2, ChevronDown } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';

const UserManagement = () => {
  const { language } = useAuth();
  const { t } = useTranslation(language);
  const { toast } = useToast();
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    status: 'active',
    language_preference: 'en',
    password_hash: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    const allUsers = await db.users.getAll();
    setUsers(allUsers);
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreate = async () => {
    try {
      if (!formData.email || !formData.name || !formData.password_hash) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      await db.users.create(formData);
      
      toast({
        title: "Success",
        description: t('users_created'),
      });
      
      setIsCreateModalOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    try {
      await db.users.update(selectedUser.id, formData);
      
      toast({
        title: "Success",
        description: t('users_updated'),
      });
      
      setIsEditModalOpen(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(t('users_confirm_delete'))) {
      return;
    }

    try {
      await db.users.delete(userId);
      
      toast({
        title: "Success",
        description: t('users_deleted'),
      });
      
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await db.users.update(userId, { status: newStatus });
      
      toast({
        title: "Success",
        description: "User status updated",
      });
      
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      status: user.status || 'active',
      language_preference: user.language_preference || 'en',
      password_hash: '',
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'student',
      status: 'active',
      language_preference: 'en',
      password_hash: '',
    });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>User Management - CHANAK International Academy</title>
        <meta name="description" content="Manage users, students, tutors, and parents" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('users_title')}</h1>
            <p className="text-white/60">Manage all users in the system</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('users_add')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                  <Input
                    placeholder={t('users_search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="md:w-48"
              >
                <option value="all">{t('users_filter_all')}</option>
                <option value="student">{t('users_filter_student')}</option>
                <option value="tutor">{t('users_filter_tutor')}</option>
                <option value="parent">{t('users_filter_parent')}</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('users_name')}</TableHead>
                    <TableHead>{t('users_email')}</TableHead>
                    <TableHead>{t('users_role')}</TableHead>
                    <TableHead>{t('users_status')}</TableHead>
                    <TableHead>{t('users_language')}</TableHead>
                    <TableHead>{t('users_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.status}
                          onChange={(e) => handleStatusChange(user.id, e.target.value)}
                          className="w-32"
                        >
                          <option value="active">{t('active')}</option>
                          <option value="inactive">{t('inactive')}</option>
                          <option value="suspended">{t('suspended')}</option>
                        </Select>
                      </TableCell>
                      <TableCell>{user.language_preference === 'es' ? 'Español' : 'English'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(user)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(user.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users_add')}</DialogTitle>
            <DialogDescription>Create a new user account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('users_name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="email">{t('users_email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password_hash}
                onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="role">{t('users_role')}</Label>
              <Select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="student">{t('student')}</option>
                <option value="tutor">{t('tutor')}</option>
                <option value="parent">{t('parent')}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">{t('users_language')}</Label>
              <Select
                id="language"
                value={formData.language_preference}
                onChange={(e) => setFormData({ ...formData, language_preference: e.target.value })}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users_edit')}</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('users_name')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">{t('users_email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">{t('users_role')}</Label>
              <Select
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="student">{t('student')}</option>
                <option value="tutor">{t('tutor')}</option>
                <option value="parent">{t('parent')}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">{t('users_status')}</Label>
              <Select
                id="edit-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactive')}</option>
                <option value="suspended">{t('suspended')}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-language">{t('users_language')}</Label>
              <Select
                id="edit-language"
                value={formData.language_preference}
                onChange={(e) => setFormData({ ...formData, language_preference: e.target.value })}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleEdit} className="bg-purple-600 hover:bg-purple-700">
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UserManagement;