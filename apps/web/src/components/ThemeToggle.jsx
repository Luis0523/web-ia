import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { applyTheme, getInitialTheme, THEME_KEY } from '../theme.js';

export default function ThemeToggle({ showLabel = false }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={isDark}
    >
      <Icon name={isDark ? 'sun' : 'moon'} className="icon-sm" />
      {showLabel && <span>{isDark ? 'Claro' : 'Oscuro'}</span>}
    </button>
  );
}
