import { useState, useEffect, useCallback } from 'react';
import { userService } from '@/services/userService';
import { useToast } from '@/components/ui/use-toast';

export const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const response = await userService.getUsers();
    if (response.success) {
      setUsers(response.data);
      setError(null);
    } else {
      setError(response.error);
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: response.error
      });
    }
    setLoading(false);
  }, [toast]);

  const createUser = async (email, name, role) => {
    const response = await userService.createUser(email, name, role);
    if (response.success) {
      toast({
        title: "User created",
        description: `${name} has been added successfully.`,
      });
      fetchUsers(); // Refresh list
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: response.error,
      });
      return false;
    }
  };

  const updateUser = async (id, name, role) => {
    const response = await userService.updateUser(id, name, role);
    if (response.success) {
      toast({
        title: "User updated",
        description: "User details have been updated.",
      });
      fetchUsers();
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: response.error,
      });
      return false;
    }
  };

  const deleteUser = async (id) => {
    const response = await userService.deleteUser(id);
    if (response.success) {
      toast({
        title: "User deleted",
        description: "The user has been removed.",
      });
      fetchUsers();
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: response.error,
      });
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    fetchUsers
  };
};