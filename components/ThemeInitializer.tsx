import { useEffect } from 'react';

/**
 * Component that initializes theme before app renders
 * Should be placed at the top of the component tree
 */
export default function ThemeInitializer() {
  useEffect(() => {
    // This runs on mount, but we also need to run it immediately
    // The actual initialization happens in the script below
  }, []);

  return null;
}

// Initialize theme immediately (synchronously) to prevent flash
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme');
  const root = document.documentElement;
  
  let shouldBeDark = false;
  
  if (savedTheme === 'dark') {
    shouldBeDark = true;
  } else if (savedTheme === 'light') {
    shouldBeDark = false;
  } else {
    // No saved preference or 'system' - use system preference
    shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // Apply theme immediately
  if (shouldBeDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
