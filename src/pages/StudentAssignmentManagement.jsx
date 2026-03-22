import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Network, Plus, Trash2, Users } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';

const StudentAssignmentManagement = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [hubs, setHubs] = useState([]);
  
  const [studentParents, setStudentParents] = useState([]);
  const [studentTutors, setStudentTutors] = useState([]);
  const [studentHubs, setStudentHubs] = useState([]);

  const [modalType, setModalType] = useState(null); // 'parent', 'tutor', 'hub'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formValue, setFormValue] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setStudents(await db.students.getAll());
    setUsers(await db.users.getAll());
    setHubs(await db.hubs.getAll());
    setStudentParents(await db.studentParents.getAll());
    setStudentTutors(await db.studentTutors.getAll());
    setStudentHubs(await db.studentHubs.getAll());
  };

  const getStudentName = (id) => {
    const s = students.find(x => x.id === id);
    const u = users.find(x => x.id === s?.user_id);
    return s?.name || u?.name || 'Unknown Student';
  };

  const getUserName = (id) => users.find(u => u.id === id)?.name || 'Unknown';
  const getHubName = (id) => hubs.find(h => h.id === id)?.name || 'Unknown Hub';

  const handleAssign = async () => {
    if (!selectedStudentId || !formValue) return;

    try {
      if (modalType === 'parent') {
        const newAssign = await db.studentParents.create({ student_id: selectedStudentId, parent_user_id: formValue });
        setStudentParents([...studentParents, newAssign]);
      } else if (modalType === 'tutor') {
        const newAssign = await db.studentTutors.create({ student_id: selectedStudentId, tutor_user_id: formValue });
        setStudentTutors([...studentTutors, newAssign]);
      } else if (modalType === 'hub') {
        // Remove existing hub assignment for this student first (since it's single select)
        const updatedHubs = studentHubs.filter(sh => sh.student_id !== selectedStudentId);
        const newAssign = await db.studentHubs.create({ student_id: selectedStudentId, hub_id: formValue });
        setStudentHubs([...updatedHubs, newAssign]);
      }
      
      toast({ title: "Success", description: "Assignment created successfully" });
      setModalType(null);
      setFormValue('');
    } catch (error) {
      toast({ title: "Error", description: "Assignment failed (check duplicates)", variant: "destructive" });
    }
  };

  const handleRemove = async (type, id) => {
    if (!window.confirm("Remove this assignment?")) return;
    try {
      if (type === 'parent') {
        await db.studentParents.delete(id);
        setStudentParents(studentParents.filter(x => x.id !== id));
      } else if (type === 'tutor') {
        await db.studentTutors.delete(id);
        setStudentTutors(studentTutors.filter(x => x.id !== id));
      } else if (type === 'hub') {
        await db.studentHubs.delete(id);
        setStudentHubs(studentHubs.filter(x => x.id !== id));
      }
      toast({ title: "Success", description: "Assignment removed" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>Student Assignments - CHANAK Academy</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Assignments</h1>
          <p className="text-white/60">Manage parent, tutor, and hub relationships</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white">Student</TableHead>
                  <TableHead className="text-white">Parents</TableHead>
                  <TableHead className="text-white">Tutors</TableHead>
                  <TableHead className="text-white">Hub</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const parents = studentParents.filter(sp => sp.student_id === student.id);
                  const tutors = studentTutors.filter(st => st.student_id === student.id);
                  const hub = studentHubs.find(sh => sh.student_id === student.id);

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-white">{getStudentName(student.id)}</TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {parents.map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs bg-white/5 p-1 rounded">
                              <span className="text-white/80">{getUserName(p.parent_user_id)}</span>
                              <button onClick={() => handleRemove('parent', p.id)} className="text-red-400 hover:text-red-300 ml-2">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedStudentId(student.id); setModalType('parent'); }} className="h-6 text-xs text-[#2F80ED] justify-start px-0 hover:bg-transparent hover:text-white">
                            <Plus className="w-3 h-3 mr-1" /> Add Parent
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {tutors.map(t => (
                            <div key={t.id} className="flex items-center justify-between text-xs bg-white/5 p-1 rounded">
                              <span className="text-white/80">{getUserName(t.tutor_user_id)}</span>
                              <button onClick={() => handleRemove('tutor', t.id)} className="text-red-400 hover:text-red-300 ml-2">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedStudentId(student.id); setModalType('tutor'); }} className="h-6 text-xs text-[#2F80ED] justify-start px-0 hover:bg-transparent hover:text-white">
                            <Plus className="w-3 h-3 mr-1" /> Add Tutor
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell>
                        {hub ? (
                          <div className="flex items-center justify-between text-xs bg-white/5 p-1 rounded">
                            <span className="text-white/80">{getHubName(hub.hub_id)}</span>
                            <div className="flex gap-1">
                              <button onClick={() => { setSelectedStudentId(student.id); setModalType('hub'); }} className="text-[#2F80ED] hover:text-white">Edit</button>
                              <button onClick={() => handleRemove('hub', hub.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedStudentId(student.id); setModalType('hub'); }} className="h-6 text-xs text-[#2F80ED] justify-start px-0 hover:bg-transparent hover:text-white">
                            <Plus className="w-3 h-3 mr-1" /> Assign Hub
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Universal Modal */}
        <Dialog open={!!modalType} onOpenChange={() => setModalType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {modalType === 'parent' && 'Assign Parent'}
                {modalType === 'tutor' && 'Assign Tutor'}
                {modalType === 'hub' && 'Assign Hub'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Label>Select {modalType === 'hub' ? 'Hub' : 'User'}</Label>
              <Select value={formValue} onChange={(e) => setFormValue(e.target.value)}>
                <option value="">Select...</option>
                {modalType === 'parent' && users.filter(u => u.role === 'parent').map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
                {modalType === 'tutor' && users.filter(u => u.role === 'tutor').map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
                {modalType === 'hub' && hubs.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
              <Button onClick={handleAssign} className="bg-[#0B2D5C]">Assign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default StudentAssignmentManagement;