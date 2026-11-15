import { LANGS, useLang } from '../i18n';

// Segmented control. Switching language updates the interface in place,
// without reloading the page.
export default function LangToggle({ compact = false, className = '' }) {
  const { lang, setLang, t } = useLang();

  return (
    <div
      className={`lang-switch ${compact ? 'lang-switch-compact' : ''} ${className}`.trim()}
      role="group"
      aria-label={t.language}
    >
      {LANGS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="lang-option"
          lang={item.id}
          dir={item.dir}
          aria-pressed={lang === item.id}
          title={item.label}
          onClick={() => setLang(item.id)}
        >
          {compact ? item.short : item.label}
        </button>
      ))}
    </div>
  );
}
