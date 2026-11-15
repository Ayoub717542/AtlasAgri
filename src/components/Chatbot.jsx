import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icons';
import { useLang } from '../i18n';

// Keyword sets in the three interface languages. The answers are prepared from
// the same data the page already loaded, so they follow the selected area.
const TOPICS = [
  { id: 'rain', keys: ['rain', 'water', 'irrigat', 'dry', 'drought', 'pluie', 'eau', 'irrigu', 'sec', 'مطر', 'ماء', 'سقي', 'جفاف', 'الشتا'] },
  { id: 'fertilizer', keys: ['nitrogen', 'fertili', 'manure', 'npk', 'azote', 'fumier', 'engrais', 'آزوت', 'ازوت', 'سماد', 'غبار'] },
  { id: 'soil', keys: ['soil', 'ph ', 'salt', 'salin', 'sol', 'terre', 'ترب', 'الأرض', 'ملوحة', 'حموضة'] },
  { id: 'crop', keys: ['wheat', 'barley', 'crop', 'plant', 'grow', 'sow', 'blé', 'orge', 'culture', 'planter', 'semer', 'قمح', 'شعير', 'محصول', 'أزرع', 'نزرع', 'شنو'] },
  { id: 'legume', keys: ['faba', 'bean', 'legume', 'chickpea', 'lentil', 'féverole', 'fève', 'pois', 'lentille', 'فول', 'حمص', 'بقول', 'قطاني'] },
  { id: 'heat', keys: ['heat', 'hot', 'temperature', 'chaleur', 'température', 'حرارة', 'حر', 'الصهد', 'سخون'] },
  { id: 'rotation', keys: ['rotation', 'تناوب', 'دورة', 'الدورة'] },
  { id: 'satellite', keys: ['satellite', 'nasa', 'accura', 'exact', 'trust', 'précis', 'confiance', 'قمر', 'ناسا', 'دقيق', 'دقة'] },
  { id: 'hello', keys: ['hello', 'salam', 'bonjour', 'salut', 'سلام', 'مرحبا', 'أهلا'] },
];

const ASK = {
  rain: 'ansRain',
  fertilizer: 'ansFertilizer',
  soil: 'ansSoil',
  crop: 'ansPlant',
  legume: 'ansLegume',
  heat: 'ansHeat',
  rotation: 'ansRotation',
  satellite: 'ansSatellite',
  hello: 'ansHello',
};

const SPEECH_LANG = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };

const getRecognition = () => {
  if (typeof window === 'undefined') return null;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
};

export default function Chatbot({ context }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [voice, setVoice] = useState({ status: 'idle', text: '' });
  const recognition = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const timer = useRef(null);

  const supported = useMemo(() => Boolean(getRecognition()), []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, voice.status]);

  useEffect(() => {
    if (!open) return;
    const focus = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(focus);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => {
    recognition.current?.stop?.();
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const resolve = (question) => {
    const q = question.toLowerCase();
    const topic = TOPICS.find((item) => item.keys.some((key) => q.includes(key)));
    if (!topic) return t.ansFallback;
    const fn = t[ASK[topic.id]];
    return typeof fn === 'function' ? fn(context) : t.ansFallback;
  };

  const send = (question) => {
    const clean = question.trim();
    if (!clean || typing) return;
    setMessages((list) => [...list, { from: 'user', text: clean }]);
    setText('');
    setVoice({ status: 'idle', text: '' });
    setTyping(true);
    timer.current = window.setTimeout(() => {
      setMessages((list) => [...list, { from: 'bot', text: resolve(clean) }]);
      setTyping(false);
    }, 850);
  };

  const stopVoice = () => {
    recognition.current?.stop?.();
    setVoice((current) => (current.status === 'listening' ? { status: 'idle', text: current.text } : current));
  };

  const startVoice = () => {
    if (!supported) {
      setVoice({ status: 'unsupported', text: '' });
      return;
    }
    if (voice.status === 'listening') {
      stopVoice();
      return;
    }
    const engine = getRecognition();
    recognition.current = engine;
    engine.lang = SPEECH_LANG[lang] ?? 'en-US';
    engine.interimResults = true;
    engine.continuous = false;
    engine.maxAlternatives = 1;
    engine.onresult = (event) => {
      let heard = '';
      for (let i = 0; i < event.results.length; i++) heard += event.results[i][0].transcript;
      setVoice({ status: 'listening', text: heard.trim() });
    };
    engine.onerror = (event) => {
      setVoice({
        status: event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'denied' : 'error',
        text: '',
      });
    };
    engine.onend = () => {
      setVoice((current) => (current.status === 'listening' ? { status: 'idle', text: current.text } : current));
    };
    try {
      engine.start();
      setVoice({ status: 'listening', text: '' });
    } catch {
      setVoice({ status: 'error', text: '' });
    }
  };

  const suggestions = [t.chatSuggest1, t.chatSuggest2, t.chatSuggest3, t.chatSuggest4];
  const voiceMessage = {
    unsupported: t.voiceUnsupported,
    error: t.voiceError,
    denied: t.voiceNotAllowed,
  }[voice.status];

  return (
    <div className={`chat ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="chat-panel" role="dialog" aria-modal="false" aria-label={t.chatTitle}>
          <header className="chat-head">
            <span className="chat-avatar"><Icon name="chat" size={20} /></span>
            <div className="chat-title">
              <strong>{t.chatTitle}</strong>
              <span>{t.chatNote}</span>
            </div>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={t.chatClose}>
              <Icon name="close" size={20} />
            </button>
          </header>

          <div className="chat-list" ref={listRef} role="log" aria-live="polite">
            <div className="msg bot">
              <span className="msg-avatar" aria-hidden="true"><Icon name="leaf" size={15} /></span>
              <p>{t.chatGreeting(context.place)}</p>
            </div>
            {messages.map((message, index) => (
              <div key={`${message.from}-${index}`} className={`msg ${message.from}`}>
                {message.from === 'bot' && (
                  <span className="msg-avatar" aria-hidden="true"><Icon name="leaf" size={15} /></span>
                )}
                <p dir="auto">{message.text}</p>
              </div>
            ))}
            {typing && (
              <div className="msg bot">
                <span className="msg-avatar" aria-hidden="true"><Icon name="leaf" size={15} /></span>
                <p className="typing" aria-label={t.chatTyping}>
                  <span /><span /><span />
                </p>
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="chat-suggest">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" className="chip" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {(voice.status === 'listening' || (voice.text && voice.status === 'idle')) && (
            <div className={`voice-preview ${voice.status}`} role="status" aria-live="polite">
              <p>
                <Icon name="mic" size={16} />
                {voice.status === 'listening' && !voice.text && t.voiceListening}
                {voice.text && <><span className="voice-label">{t.voiceHeard}:</span> “{voice.text}”</>}
              </p>
              <div className="voice-actions">
                <button type="button" className="btn btn-small btn-primary" onClick={() => send(voice.text)} disabled={!voice.text}>
                  {t.voiceUse}
                </button>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setVoice({ status: 'idle', text: '' })}>
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {voiceMessage && (
            <p className="voice-note" role="alert">
              <Icon name="alert" size={15} /> {voiceMessage}
            </p>
          )}

          <form className="chat-form" onSubmit={(event) => { event.preventDefault(); send(text); }}>
            <button
              type="button"
              className={`icon-btn mic ${voice.status === 'listening' ? 'is-listening' : ''} ${supported ? '' : 'is-muted'}`}
              onClick={startVoice}
              aria-label={voice.status === 'listening' ? t.voiceStop : t.voiceStart}
              aria-pressed={voice.status === 'listening'}
              title={supported ? t.voiceStart : t.voiceUnsupported}
            >
              <Icon name="mic" size={20} />
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t.chatPlaceholder}
              aria-label={t.chatPlaceholder}
              dir="auto"
            />
            <button className="icon-btn send" type="submit" aria-label={t.chatSend} disabled={!text.trim() || typing}>
              <Icon name="send" size={19} />
            </button>
          </form>
          <p className="chat-disclaimer">{t.chatDisclaimer}</p>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? t.chatClose : t.chatOpen}
      >
        <Icon name={open ? 'close' : 'chat'} size={24} />
        {!open && <span>{t.chatOpen}</span>}
      </button>
    </div>
  );
}
