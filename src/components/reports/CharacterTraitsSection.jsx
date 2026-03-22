import React from 'react';
import { useProgressReportContext } from '@/context/ProgressReportContext';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const CharacterTraitsSection = () => {
  const { traits, updateTrait } = useProgressReportContext();
  const { language, currentUser } = useAuth();
  const { t } = useTranslation(language);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'tutor';

  return (
    <div className="rounded-lg border border-white/20 overflow-hidden mt-6">
      <div className="bg-indigo-900/40 p-3 font-semibold text-white border-b border-white/20">
        {t('report_character_traits')}
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {traits.map((trait, index) => (
          <div key={index} className="bg-white/5 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-white">{trait.trait_name}</span>
            </div>
            
            <Select
              value={trait.rating}
              onChange={(e) => updateTrait(index, 'rating', e.target.value)}
              disabled={!canEdit}
              className="w-full bg-white/10 border-white/20 text-sm"
            >
              <option value="E">{t('report_rating_e')} (E)</option>
              <option value="S">{t('report_rating_s')} (S)</option>
              <option value="N">{t('report_rating_n')} (N)</option>
            </Select>

            <Input 
              value={trait.notes || ''}
              onChange={(e) => updateTrait(index, 'notes', e.target.value)}
              disabled={!canEdit}
              placeholder={t('report_notes')}
              className="bg-transparent border-white/10 h-8 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharacterTraitsSection;