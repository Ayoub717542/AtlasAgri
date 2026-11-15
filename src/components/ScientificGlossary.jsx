import { useState } from 'react';
import Icon from './Icons';
import { useLang } from '../i18n';

const GLOSSARY_TOPICS = [
  { id: 'et', icon: 'thermometer', titleKey: 'glossaryEtTitle', textKey: 'glossaryEtDesc', tagKey: 'glossaryTagConcept' },
  { id: 'smap', icon: 'drop', titleKey: 'glossarySmapTitle', textKey: 'glossarySmapDesc', tag: 'SMAP L4 (9 km)' },
  { id: 'ndvi', icon: 'sprout', titleKey: 'glossaryNdviTitle', textKey: 'glossaryNdviDesc', tagKey: 'glossaryTagNotUsed' },
  { id: 'frost', icon: 'sun', titleKey: 'glossaryFrostTitle', textKey: 'glossaryFrostDesc', tagKey: 'glossaryTagDemo' },
  { id: 'fusion', icon: 'layers', titleKey: 'glossaryFusionTitle', textKey: 'glossaryFusionDesc', tagKey: 'glossaryTagDemo' },
  { id: 'decision', icon: 'shield', titleKey: 'glossaryDecisionTitle', textKey: 'glossaryDecisionDesc', tagKey: 'glossaryTagFarmer' },
];

export default function ScientificGlossary({ defaultOpen = false }) {
  const { t } = useLang();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="panel glossary-panel">
      <div className="glossary-header" onClick={() => setOpen((prev) => !prev)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((prev) => !prev)}>
        <div className="glossary-title-group">
          <span className="glossary-icon-badge"><Icon name="globe" size={20} /></span>
          <div>
            <h3 className="glossary-title">{t.glossaryTitle}</h3>
            <p className="glossary-sub">{t.glossarySub}</p>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-small glossary-toggle-btn" aria-expanded={open}>
          <span>{open ? t.close : t.openMenu}</span>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        </button>
      </div>

      {open && (
        <div className="glossary-grid">
          {GLOSSARY_TOPICS.map((item) => (
            <article key={item.id} className="glossary-card">
              <div className="glossary-card-top">
                <span className="glossary-card-icon"><Icon name={item.icon} size={18} /></span>
                <span className="tag tag-soft">{item.tagKey ? t[item.tagKey] : item.tag}</span>
              </div>
              <h4>{t[item.titleKey]}</h4>
              <p>{t[item.textKey]}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
