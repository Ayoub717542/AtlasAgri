import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';

// Tiny hash router: #/  and  #/dashboard/<tab>?loc=<id>&ref=<lat,lon>
function parse(hash) {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);
  return {
    page: parts[0] ?? '',
    tab: parts[1],
    loc: params.get('loc'),
    ref: params.get('ref'),
    sup: params.get('sup'),
  };
}

export default function App() {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Scroll to top only when changing page (not when switching tab or location)
  useEffect(() => { window.scrollTo({ top: 0 }); }, [route.page]);

  const navigate = (hash) => { window.location.hash = hash; };

  if (route.page === 'dashboard') {
    return <Dashboard tab={route.tab} locId={route.loc} refParam={route.ref} sup={route.sup} navigate={navigate} />;
  }
  return <Landing />;
}
