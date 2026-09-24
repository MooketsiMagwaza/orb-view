import { useState } from "react";
import type { SourceEntry } from "../sources/useConceptSources";
import type { SourceImage } from "../sources/types";

function Figure({ image, lead }: { image: SourceImage; lead?: boolean }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (broken) return null;
  return (
    <figure className={`figure${lead ? " figure--lead" : ""}${loaded ? " is-loaded" : ""}`}>
      <div className="figure__frame">
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
        />
      </div>
      <figcaption>
        <a href={image.creditUrl} target="_blank" rel="noopener noreferrer">{image.credit}</a>
      </figcaption>
    </figure>
  );
}

/** One provider's result: loading skeleton, the card with its images and attribution, or a plain failure. */
export function SourceCard({ entry, onRetry }: { entry: SourceEntry; onRetry: () => void }) {
  const { provider, status, card, message } = entry;

  if (status === "loading") {
    return (
      <section className="source" aria-busy="true" aria-label={`Loading from ${provider.name}`}>
        <p className="source__provider">{provider.name}</p>
        <div className="skeleton skeleton--image" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line short" />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="source">
        <p className="source__provider">{provider.name}</p>
        <p className="source__empty">
          Couldn't reach {provider.name}{navigator.onLine ? "" : " while offline"}. The note above still works without it.
        </p>
        <button type="button" className="source__retry" onClick={onRetry} title={message}>Try again</button>
      </section>
    );
  }

  if (status === "empty" || !card) return null;

  const [lead, ...rest] = card.images;
  return (
    <section className="source" aria-label={card.providerName}>
      <p className="source__provider">{card.providerName}</p>
      {lead && <Figure image={lead} lead />}
      <h3 className="source__title">{card.title}</h3>
      {card.description && <p className="source__desc">{card.description}</p>}
      {card.extract && <p className="source__extract">{card.extract}</p>}
      {rest.length > 0 && (
        <div className="source__strip">
          {rest.map((image) => <Figure key={image.url} image={image} />)}
        </div>
      )}
      <p className="source__links">
        <a href={card.url} target="_blank" rel="noopener noreferrer">{card.linkLabel} ↗</a>
        <a className="source__license" href={card.license.url} target="_blank" rel="noopener noreferrer">{card.license.label}</a>
      </p>
    </section>
  );
}
