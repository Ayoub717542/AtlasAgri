import { useEffect, useState } from 'react';

// Runs an async loader whenever `key` changes. Returns [state, retry].
export function useLoad(loader, key) {
  const [currentKey, setCurrentKey] = useState(key);
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  if (currentKey !== key) {
    setCurrentKey(key);
    setState({ status: 'loading' });
  }

  useEffect(() => {
    let live = true;
    loader(key, attempt).then(
      (data) => live && setState({ status: 'ok', data }),
      (err) => live && setState({ status: 'error', error: err.message }),
    );
    return () => { live = false; };
  }, [loader, key, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  };

  return [state, retry];
}
