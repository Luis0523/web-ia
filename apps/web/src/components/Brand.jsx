export default function Brand() {
  return (
    <div className="brand">
      <div className="logo" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="23" cy="9" r="3.2" fill="currentColor" opacity="0.9" />
          <path
            d="M3 24.5 11 13l5 6.6L20.5 13 29 24.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 24.5h26"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <strong>Web IA</strong>
        <small>Turismo inteligente</small>
      </div>
    </div>
  );
}
