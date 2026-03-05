import { useEffect, useRef, useState } from 'react';

export function useSSE(url, onMessage) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        onMessage({ type: 'text', content: event.data });
      }
    };

    es.onerror = (err) => {
      setError(err);
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [url, onMessage]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setConnected(false);
    }
  };

  return { connected, error, disconnect };
}