import React, { useState, useEffect } from 'react';
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
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { hubService } from '@/services/hubService';

const AdminHubs = () => {
  const { toast } = useToast();
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedHub, setSelectedHub] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Form States
  const [formData, setFormData] = useState({ name: '', code: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    setLoading(true);
    const { success, data, error } = await hubService.getHubs();
    if (success) {
      setHubs(data);
    } else {
      toast({
        title: "Error",
        description: error || "Failed to fetch hubs",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleOpenModal = (mode, hub = null) => {
    setModalMode(mode);
    setSelectedHub(hub);
    setFormData(hub ? { 
      name: hub.name, 
      code: hub.code || '', 
      address: hub.address || '' 
    } : { 
      name: '', 
      code: '', 
      address: '' 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name.length < 2) {
      toast({
        title: "Validation Error",
        description: "Hub name must be at least 2 characters.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    let result;

    if (modalMode === 'create') {
      result = await hubService.createHub(formData.name, formData.code, formData.address);
    } else {
      result = await hubService.updateHub(selectedHub.id, formData.name, formData.code, formData.address);
    }

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Success",
        description: `Hub ${modalMode === 'create' ? 'created' : 'updated'} successfully.`
      });
      setIsModalOpen(false);
      fetchHubs();
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const result = await hubService.deleteHub(deleteId);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Success",
        description: "Hub deleted successfully."
      });
      setDeleteId(null);
      fetchHubs();
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Hub Management</h1>
          <p className="text-white/60">Create and manage educational hubs</p>
        </div>
        <Button onClick={() => handleOpenModal('create')} className="bg-[#2F80ED]">
          <Plus className="w-4 h-4 mr-2" />
          Create Hub
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Hubs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hubs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hubs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  hubs.map((hub) => (
                    <TableRow key={hub.id}>
                      <TableCell className="font-medium">{hub.name}</TableCell>
                      <TableCell>{hub.code || '-'}</TableCell>
                      <TableCell>{hub.address || '-'}</TableCell>
                      <TableCell>{new Date(hub.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenModal('edit', hub)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(hub.id)}
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

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'create' ? 'Create Hub' : 'Edit Hub'}</DialogTitle>
            <DialogDescription>
              {modalMode === 'create' ? 'Add a new educational hub.' : 'Update existing hub details.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Hub Name (Required)</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Downtown Campus"
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Hub Code</Label>
              <Input 
                id="code" 
                value={formData.code} 
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="e.g. DT-01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="123 Education Lane"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this hub? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Delete Hub'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHubs;