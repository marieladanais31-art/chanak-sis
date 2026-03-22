import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';

const SignatureBlock = () => {
  const { language } = useAuth();
  const { t } = useTranslation(language);

  return (
    <div className="mt-8 border-t-2 border-white/10 pt-6">
      <h3 className="text-lg font-semibold text-white mb-6 text-center">{t('report_signature')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center space-y-2">
          <div className="h-16 border-b border-white/40 flex items-end justify-center pb-2">
            <span className="font-handwriting text-2xl text-white/80">Dr. Maria Director</span>
          </div>
          <p className="text-sm font-semibold text-white">{t('report_admin')}</p>
          <p className="text-xs text-white/60">{new Date().toLocaleDateString()}</p>
        </div>

        <div className="text-center space-y-2">
          <div className="h-16 border-b border-white/40"></div>
          <p className="text-sm font-semibold text-white">{t('report_supervisor')}</p>
          <p className="text-xs text-white/60">Date: ____________</p>
        </div>

        <div className="text-center space-y-2">
          <div className="h-16 border-b border-white/40"></div>
          <p className="text-sm font-semibold text-white">{t('report_tutor')}</p>
          <p className="text-xs text-white/60">Date: ____________</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white mb-1">{t('report_comments')}:</p>
          <div className="w-full h-20 border border-white/20 rounded bg-white/5"></div>
        </div>
      </div>
    </div>
  );
};

export default SignatureBlock;