interface PartnerBubbleProps {
  text: string | null;
  celebrate: boolean;
}

function PartnerFace() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#fff4cc" stroke="#ffd36b" strokeWidth="4" />
      <circle cx="38" cy="44" r="6" fill="#3a3a4a" />
      <circle cx="62" cy="44" r="6" fill="#3a3a4a" />
      <path d="M34 62 Q50 78 66 62" fill="none" stroke="#3a3a4a" strokeWidth="5" strokeLinecap="round" />
      <circle cx="28" cy="58" r="5" fill="#ffb3c7" opacity="0.7" />
      <circle cx="72" cy="58" r="5" fill="#ffb3c7" opacity="0.7" />
    </svg>
  );
}

/**
 * The partner's spoken line, shown as text too so the game is fully playable with
 * audio off. aria-live announces new lines for assistive tech.
 */
export function PartnerBubble({ text, celebrate }: PartnerBubbleProps) {
  return (
    <div className={`partner${celebrate ? ' celebrate' : ''}`} role="status" aria-live="polite">
      <div className="partner-face">
        <PartnerFace />
      </div>
      <p className="partner-say">{text ?? ''}</p>
    </div>
  );
}
