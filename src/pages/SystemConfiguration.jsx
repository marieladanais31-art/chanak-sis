import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Settings, School, Download, FileText, Clock } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';

const SystemConfiguration = () => {
  const { language } = useAuth();
  const { t } = useTranslation(language);
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    default_language: 'en',
    session_timeout: 30,
    password_min_length: 8,
    version: '1.0.0',
    last_updated: new Date().toISOString()
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const systemConfig = await db.config.get();
    if (systemConfig) {
      setConfig(systemConfig);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await db.config.update(config);
      
      toast({
        title: "Success",
        description: "System configuration updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const users = await db.users.getAll();
      
      // Convert to CSV
      const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Language', 'Created At'];
      const rows = users.map(u => [
        u.id,
        u.name || '',
        u.email,
        u.role,
        u.status,
        u.language_preference,
        u.created_at
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chanak_users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "User data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>System Configuration - CHANAK International Academy</title>
        <meta name="description" content="System settings and configuration" />
      </Helmet>

      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('config_title')}</h1>
          <p className="text-white/60">Manage system-wide settings and configuration</p>
        </div>

        {/* School Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <School className="w-5 h-5 text-purple-400" />
              <CardTitle>{t('config_school')}</CardTitle>
            </div>
            <CardDescription>Official school details and identification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-sm text-white/60">School Name</p>
                  <p className="text-white font-semibold">{t('config_name')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-sm text-white/60">Private School Code</p>
                  <p className="text-white font-semibold">#134620</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-sm text-white/60">State</p>
                  <p className="text-white font-semibold">Florida</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              <CardTitle>{t('config_settings')}</CardTitle>
            </div>
            <CardDescription>Configure system behavior and defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="default_lang">{t('config_default_lang')}</Label>
              <Select
                id="default_lang"
                value={config.default_language}
                onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="session">{t('config_session')}</Label>
              <Input
                id="session"
                type="number"
                value={config.session_timeout}
                onChange={(e) => setConfig({ ...config, session_timeout: parseInt(e.target.value) })}
                min="5"
                max="120"
              />
            </div>

            <div>
              <Label htmlFor="password">{t('config_password_policy')}</Label>
              <Input
                id="password"
                type="number"
                value={config.password_min_length}
                onChange={(e) => setConfig({ ...config, password_min_length: parseInt(e.target.value) })}
                min="6"
                max="20"
              />
              <p className="text-xs text-white/60 mt-1">Minimum password length in characters</p>
            </div>

            <Button
              onClick={handleSaveConfig}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {t('save')} Settings
            </Button>
          </CardContent>
        </Card>

        {/* Backup & Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-400" />
              <CardTitle>{t('config_backup')}</CardTitle>
            </div>
            <CardDescription>Export and backup system data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportData}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('config_export')}
            </Button>
          </CardContent>
        </Card>

        {/* System Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              <CardTitle>{t('config_logs')}</CardTitle>
            </div>
            <CardDescription>Recent system activity and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-white/60 text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-white/40" />
              <p>System logs feature coming soon</p>
              <p className="text-sm mt-2">Track all system events and administrative actions</p>
            </div>
          </CardContent>
        </Card>

        {/* Version Info */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <CardTitle>{t('config_version')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-white/60 mb-1">Version</p>
                <p className="text-white font-semibold">{config.version}</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-white/60 mb-1">Last Updated</p>
                <p className="text-white font-semibold">
                  {new Date(config.last_updated).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SystemConfiguration;