import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    
    // Function to get the actual theme based on system preference
    const getResolvedTheme = (currentTheme: Theme): 'light' | 'dark' => {
      if (currentTheme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return currentTheme;
    };

    const applyTheme = (currentTheme: Theme) => {
      const resolved = getResolvedTheme(currentTheme);
      setResolvedTheme(resolved);
      
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Apply theme immediately
    applyTheme(theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);

    // Listen for system theme changes only if theme is set to 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      // Cycle: system -> light -> dark -> system
      if (prev === 'system') {
        return resolvedTheme === 'dark' ? 'light' : 'dark';
      } else if (prev === 'light') {
        return 'dark';
      } else {
        return 'system';
      }
    });
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} title={`Tema: ${theme}`}>
      {resolvedTheme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
