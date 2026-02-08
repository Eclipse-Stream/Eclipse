// HelpFaqSection.tsx - Section FAQ (Story 10.1, AC5)
// Questions fréquentes avec réponses expandables

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqItemComponentProps {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqItemComponent({ item, isOpen, onToggle }: FaqItemComponentProps) {
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-start gap-3 w-full py-3 text-left group"
      >
        <HelpCircle
          size={16}
          className={`mt-0.5 flex-shrink-0 transition-colors ${isOpen ? 'text-corona' : 'text-text-secondary/50 group-hover:text-text-secondary'}`}
        />
        <span className={`flex-1 text-[13px] transition-colors ${isOpen ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
          {item.question}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-text-secondary/50 transition-transform ${isOpen ? 'rotate-180 text-corona' : ''}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-48 opacity-100 pb-3' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-[12px] text-text-secondary pl-7 pr-4">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export function HelpFaqSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Build FAQ items from translations
  const faqItems = useMemo<FaqItem[]>(() => [
    { question: t('help.faq.q1'), answer: t('help.faq.a1') },
    { question: t('help.faq.q2'), answer: t('help.faq.a2') },
    { question: t('help.faq.q3'), answer: t('help.faq.a3') },
    { question: t('help.faq.q4'), answer: t('help.faq.a4') },
    { question: t('help.faq.q5'), answer: t('help.faq.a5') },
  ], [t]);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-3">
        {t('help.faq.title')}
      </h2>

      <div>
        {faqItems.map((item, index) => (
          <FaqItemComponent
            key={index}
            item={item}
            isOpen={openIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>

      {/* Lien vers Discord pour plus d'aide */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[11px] text-text-secondary/70">
        <MessageCircle size={14} className="text-corona/60" />
        <span>
          {t('help.faq.moreQuestions')}{' '}
          <span className="text-corona">{t('help.faq.creditsLink')}</span> {t('help.faq.bottomLeft')}
        </span>
      </div>
    </GlassCard>
  );
}

export default HelpFaqSection;
