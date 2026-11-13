import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('datacore_theme') as Theme) || 'dark';
  });

  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    return localStorage.getItem('datacore_reduced_motion') === 'true' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const root = document.documentElement;
    let effectiveDark = false;

    if (theme === 'system') {
      effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      effectiveDark = theme === 'dark';
    }

    setIsDark(effectiveDark);
    if (effectiveDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('datacore_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setReducedMotion = (reduced: boolean) => {
    setReducedMotionState(reduced);
    localStorage.setItem('datacore_reduced_motion', String(reduced));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, reducedMotion, setReducedMotion }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
