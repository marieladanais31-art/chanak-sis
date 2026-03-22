import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { UserCog, Plus, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';

const HubStaffManagement = () => {
  const { toast } = useToast();
  const [hubs, setHubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ user_id: '', role_in_hub: 'hub_tutor' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const hubsData = await db.hubs.getAll();
    setHubs(hubsData);
    if (hubsData.length > 0) setSelectedHubId(hubsData[0].id);

    const usersData = await db.users.getAll();
    setUsers(usersData);

    const staffData = await db.hubStaff.getAll();
    setStaff(staffData);
  };

  const filteredStaff = staff.filter(s => s.hub_id === selectedHubId);

  const handleAddStaff = async () => {
    if (!formData.user_id) return;
    
    // Check duplicate
    const exists = staff.some(s => 
      s.hub_id === selectedHubId && 
      s.user_id === formData.user_id && 
      s.role_in_hub === formData.role_in_hub
    );

    if (exists) {
      toast({ title: "Error", description: "Staff assignment already exists", variant: "destructive" });
      return;
    }

    try {
      const newStaff = await db.hubStaff.create({
        hub_id: selectedHubId,
        user_id: formData.user_id,
        role_in_hub: formData.role_in_hub
      });
      setStaff([...staff, newStaff]);
      toast({ title: "Success", description: "Staff added successfully" });
      setIsAddModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Remove this staff member?")) return;
    try {
      await db.hubStaff.delete(id);
      setStaff(staff.filter(s => s.id !== id));
      toast({ title: "Success", description: "Staff removed" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getUserName = (id) => users.find(u => u.id === id)?.name || 'Unknown';

  return (
    <AdminLayout>
      <Helmet><title>Hub Staff - CHANAK Academy</title></Helmet>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Hub Staff Management</h1>
            <p className="text-white/60">Assign coordinators and tutors to hubs</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#0B2D5C]">
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="w-64">
              <Label className="text-white mb-2 block">Select Hub</Label>
              <Select value={selectedHubId} onChange={(e) => setSelectedHubId(e.target.value)}>
                {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white">Staff Name</TableHead>
                  <TableHead className="text-white">Role</TableHead>
                  <TableHead className="text-white">Assigned Date</TableHead>
                  <TableHead className="text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-white font-medium">{getUserName(s.user_id)}</TableCell>
                    <TableCell className="text-white/70 capitalize">{s.role_in_hub.replace('_', ' ')}</TableCell>
                    <TableCell className="text-white/70">{new Date(s.assigned_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(s.id)} className="text-red-400 hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff to Hub</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>User</Label>
                <Select value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}>
                  <option value="">Select User...</option>
                  {users.filter(u => u.role === 'tutor' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Role in Hub</Label>
                <Select value={formData.role_in_hub} onChange={(e) => setFormData({ ...formData, role_in_hub: e.target.value })}>
                  <option value="hub_tutor">Hub Tutor</option>
                  <option value="coordinator">Coordinator</option>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStaff} className="bg-[#0B2D5C]">Assign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default HubStaffManagement;