import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Languages, Globe, FileText } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';

const LanguageSettings = () => {
  const { currentUser, language, updateLanguage } = useAuth();
  const { t } = useTranslation(language);
  const { toast } = useToast();
  
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const handleSaveLanguage = async () => {
    try {
      // Update language in context
      updateLanguage(selectedLanguage);
      
      // Update in database
      await db.users.update(currentUser.user_id, {
        language_preference: selectedLanguage
      });

      toast({
        title: "Success",
        description: t('lang_updated'),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const languages = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      description: 'United States English',
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      description: 'Spanish (Latin America)',
    },
  ];

  return (
    <AdminLayout>
      <Helmet>
        <title>Language Settings - CHANAK International Academy</title>
        <meta name="description" content="Manage language and internationalization settings" />
      </Helmet>

      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('lang_title')}</h1>
          <p className="text-white/60">Configure language preferences and bilingual support</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" />
              <CardTitle>{t('lang_preference')}</CardTitle>
            </div>
            <CardDescription>
              Select your preferred language for the system interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {languages.map((lang) => (
                <label
                  key={lang.code}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedLanguage === lang.code
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={lang.code}
                    checked={selectedLanguage === lang.code}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{lang.name}</p>
                      <span className="text-sm text-white/60">({lang.nativeName})</span>
                    </div>
                    <p className="text-sm text-white/60">{lang.description}</p>
                  </div>
                  {selectedLanguage === lang.code && (
                    <span className="text-purple-400 font-semibold">✓ Active</span>
                  )}
                </label>
              ))}
            </div>

            <Button
              onClick={handleSaveLanguage}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
            >
              {t('save')} {t('lang_preference')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-400" />
              <CardTitle>Bilingual Features</CardTitle>
            </div>
            <CardDescription>
              System supports English and Spanish throughout the interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="p-2 bg-blue-500/20 rounded">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Global Language Selector</p>
                  <p className="text-sm text-white/60">
                    Change language anytime from your profile menu in the header
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="p-2 bg-purple-500/20 rounded">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Bilingual Reports</p>
                  <p className="text-sm text-white/60">
                    All reports and transcripts adapt to your selected language preference
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="p-2 bg-green-500/20 rounded">
                  <Languages className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">User-Specific Settings</p>
                  <p className="text-sm text-white/60">
                    Each user can set their own language preference independently
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardHeader>
            <CardTitle>Language Coverage</CardTitle>
            <CardDescription>Currently supported languages and regions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="font-semibold text-white mb-2">English (en)</p>
                <ul className="text-sm text-white/60 space-y-1">
                  <li>• All navigation and menus</li>
                  <li>• Form labels and buttons</li>
                  <li>• Error and success messages</li>
                  <li>• Reports and documentation</li>
                </ul>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <p className="font-semibold text-white mb-2">Español (es)</p>
                <ul className="text-sm text-white/60 space-y-1">
                  <li>• Toda la navegación y menús</li>
                  <li>• Etiquetas de formularios y botones</li>
                  <li>• Mensajes de error y éxito</li>
                  <li>• Informes y documentación</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default LanguageSettings;