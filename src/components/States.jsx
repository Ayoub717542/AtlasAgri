import Icon from './Icons';
import { useLang } from '../i18n';

export function Loading({ label, height = 260, steps }) {
  return (
    <div className="state state-loading" style={{ minHeight: height }} role="status" aria-live="polite">
      {steps ? (
        <div className="skeleton-lines" aria-hidden="true">
          <span /><span /><span />
        </div>
      ) : (
        <div className="pulse-bars" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
      )}
      <p className="state-label">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useLang();
  return (
    <div className="state state-error" role="alert">
      <Icon name="alert" className="state-icon" size={26} />
      <p className="state-title">{t.errTitle}</p>
      <p>{t[message] ?? message} {t.errOther}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        <Icon name="rotate" size={18} /> {t.retry}
      </button>
    </div>
  );
}

export function EmptyState({ title, children, action, icon = 'sprout' }) {
  return (
    <div className="state state-empty">
      <Icon name={icon} className="state-icon" size={26} />
      <p className="state-title">{title}</p>
      <p>{children}</p>
      {action}
    </div>
  );
}

// Shows where a number comes from and how large an area it covers.
export function Source({ meta, note }) {
  const { t } = useLang();
  if (!meta) return null;
  return (
    <p className="source">
      <span className="source-line">
        {t.source}: {meta.dataset}
      </span>
      {meta.resolution && <span>{meta.resolution}</span>}
      {note && <span>{note}</span>}
      <span className="sim-tag">{t.simulated}</span>
    </p>
  );
}
