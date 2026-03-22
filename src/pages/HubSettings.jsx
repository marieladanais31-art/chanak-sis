import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Building2, Edit, MapPin } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';

const HubSettings = () => {
  const { toast } = useToast();
  const [hubs, setHubs] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHub, setSelectedHub] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '' });

  useEffect(() => {
    loadHubs();
  }, []);

  const loadHubs = async () => {
    const data = await db.hubs.getAll();
    setHubs(data);
  };

  const openEditModal = (hub) => {
    setSelectedHub(hub);
    setFormData({ name: hub.name, location: hub.location });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      await db.hubs.update(selectedHub.id, formData);
      toast({ title: "Success", description: "Hub updated successfully" });
      setIsEditModalOpen(false);
      loadHubs();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>Hub Settings - CHANAK Academy</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Hub Settings</h1>
          <p className="text-white/60">Manage educational hubs and locations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registered Hubs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white">Hub Name</TableHead>
                  <TableHead className="text-white">Code</TableHead>
                  <TableHead className="text-white">Location</TableHead>
                  <TableHead className="text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hubs.map((hub) => (
                  <TableRow key={hub.id}>
                    <TableCell className="font-medium text-white">{hub.name}</TableCell>
                    <TableCell className="text-white/70">{hub.code}</TableCell>
                    <TableCell className="text-white/70 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> {hub.location}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(hub)} className="text-[#2F80ED] hover:text-white hover:bg-[#2F80ED]">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Hub</DialogTitle>
              <DialogDescription>Update hub details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Hub Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} className="bg-[#0B2D5C] hover:bg-[#1a3c6e]">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default HubSettings;