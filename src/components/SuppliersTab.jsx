import { useMemo, useState } from 'react';
import Icon from './Icons';
import { EmptyState } from './States';
import { CATEGORY_ICON, CATEGORY_STYLE } from '../lib/categories';
import { useLang } from '../i18n';

const CATEGORIES = ['seeds', 'fertilizer', 'irrigation', 'supplies', 'services'];

export default function SuppliersTab({ suppliers, hrefFor }) {
  const { t, lang, pick } = useLang();
  const [category, setCategory] = useState('all');

  const counts = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((id) => [id, 0]));
    for (const supplier of suppliers) map[supplier.category] = (map[supplier.category] ?? 0) + 1;
    return map;
  }, [suppliers]);

  const rows = category === 'all'
    ? suppliers
    : suppliers.filter((supplier) => supplier.category === category);

  return (
    <div className="suppliers-page">
      <div className="supplier-note">
        <Icon name="info" size={18} />
        <p>{t.supplierDisclaimer}</p>
        <span className="tag tag-warn">{t.simulatedData}</span>
      </div>

      <div className="chips supplier-chips" role="group" aria-label={t.suppliersTitle}>
        <button
          type="button"
          className="chip"
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
        >
          {t.catAll} <span className="chip-count">{suppliers.length}</span>
        </button>
        {CATEGORIES.map((id) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
          >
            <Icon name={CATEGORY_ICON[id]} size={15} />
            {t[CATEGORY_STYLE[id].key]}
            <span className="chip-count">{counts[id]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t.suppliersEmptyTitle} icon="store">
          {t.suppliersEmptyText}
        </EmptyState>
      ) : (
        <>
          <p className="result-count">{t.suppliersCount(rows.length)}</p>
          <div className="supplier-grid">
            {rows.map((supplier) => {
              const style = CATEGORY_STYLE[supplier.category] ?? CATEGORY_STYLE.supplies;
              return (
                <article className={`supplier-card cat-${supplier.category}`} key={supplier.id}>
                  <header className="supplier-card-head">
                    <span className="cat-badge" style={{ background: style.color }}>
                      <Icon name={CATEGORY_ICON[supplier.category]} size={20} />
                    </span>
                    <div>
                      <p className="cat-label">{t[style.key]}</p>
                      <h3>{lang === 'ar' ? supplier.nameAr ?? supplier.name : supplier.name}</h3>
                    </div>
                  </header>

                  <p className="distance-pill">
                    <Icon name="navigation" size={15} />
                    {t.distanceFromArea(Math.round(supplier.distanceKm))}
                  </p>

                  <dl className="supplier-meta">
                    <div>
                      <dt>{t.supplierAddress}</dt>
                      <dd>{pick(supplier.address)}</dd>
                    </div>
                    <div>
                      <dt>{t.supplierHours}</dt>
                      <dd>{pick(supplier.hours)}</dd>
                    </div>
                    <div>
                      <dt>{t.supplierPhone}</dt>
                      <dd className="muted">{supplier.phone ?? t.supplierContactMissing}</dd>
                    </div>
                  </dl>

                  <footer className="supplier-card-foot">
                    <span className="tag tag-warn">{t.supplierSimulated}</span>
                    <a className="text-link" href={hrefFor('map', '&sup=1')}>
                      {t.showOnMap} <Icon name="arrowRight" size={15} />
                    </a>
                  </footer>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
