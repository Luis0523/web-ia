export default function Brand() {
  return (
    <div className="brand">
      <div className="logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 21h18M5 21V11l7-7 7 7v10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 21v-9h6v9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 4V2"
            stroke="#bbf7d0"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <strong>
          Web<span>IA</span>
        </strong>
        <small>Turismo inteligente</small>
      </div>
    </div>
  );
}
