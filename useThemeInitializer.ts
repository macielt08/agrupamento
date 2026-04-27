import { useEffect } from 'react';

/**
 * Hook to initialize theme on app mount
 * Applies theme immediately to prevent flash of wrong theme
 */
export function useThemeInitializer() {
  useEffect(() => {
    const initializeTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const root = document.documentElement;
      
      // Determine the theme to apply
      let shouldBeDark = false;
      
      if (savedTheme === 'dark') {
        shouldBeDark = true;
      } else if (savedTheme === 'light') {
        shouldBeDark = false;
      } else {
        // No saved preference or 'system' - use system preference
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      // Apply theme
      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Initialize immediately
    initializeTheme();
  }, []);
}
