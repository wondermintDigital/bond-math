import { useEffect, useRef } from 'react';

export default function ForwardVol() {
  const frameRef = useRef(null);

  // The straddle tool is a self-contained same-origin HTML file in /public.
  // Size the iframe to its content so there's no nested scrollbar.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let observer;
    const resize = () => {
      try {
        const doc = frame.contentDocument;
        if (doc) frame.style.height = `${doc.documentElement.scrollHeight}px`;
      } catch {
        /* cross-origin guard — never happens for a same-origin public file */
      }
    };
    const onLoad = () => {
      resize();
      try {
        observer = new ResizeObserver(resize);
        observer.observe(frame.contentDocument.body);
      } catch {
        /* no-op */
      }
    };
    frame.addEventListener('load', onLoad);
    if (frame.contentDocument?.readyState === 'complete') onLoad();
    window.addEventListener('resize', resize);
    return () => {
      frame.removeEventListener('load', onLoad);
      window.removeEventListener('resize', resize);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <>
      <section className="container page-intro">
        <p className="eyebrow">Options · Volatility</p>
        <h1 className="page-title">Forward Vol</h1>
        <p className="page-lede">
          Compare two option expiries on volatility instead of dollars. The tool solves each straddle&apos;s implied
          vol and extracts the forward vol between them — the true marginal cost of the extra days.
        </p>
      </section>

      <section className="container forward-vol-shell">
        <iframe
          ref={frameRef}
          src="/straddle-comparator.html"
          title="Straddle Term-Structure Comparator"
          loading="lazy"
        />
      </section>
    </>
  );
}
