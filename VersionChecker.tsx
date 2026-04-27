import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';

const APP_VERSION = Date.now().toString();

export default function VersionChecker() {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  useEffect(() => {
    // Use sessionStorage to track if notification was shown in this session
    const notificationShown = sessionStorage.getItem('update_notification_shown');
    const storedVersion = localStorage.getItem('app_version');
    
    if (!storedVersion) {
      // First time visitor - store current version
      localStorage.setItem('app_version', APP_VERSION);
    } else if (storedVersion !== APP_VERSION && !notificationShown) {
      // New version detected and notification not shown in this session
      setShowUpdateNotification(true);
      sessionStorage.setItem('update_notification_shown', 'true');
    }

    const checkInterval = setInterval(() => {
      const currentStoredVersion = localStorage.getItem('app_version');
      const alreadyShown = sessionStorage.getItem('update_notification_shown');
      
      if (currentStoredVersion !== APP_VERSION && !alreadyShown) {
        setShowUpdateNotification(true);
        sessionStorage.setItem('update_notification_shown', 'true');
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, []);

  const handleReload = () => {
    // Update version and reload
    localStorage.setItem('app_version', APP_VERSION);
    setShowUpdateNotification(false);
    window.location.reload();
  };

  const handleDismiss = () => {
    // Just hide for this session
    setShowUpdateNotification(false);
  };

  if (!showUpdateNotification) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
      <Card className="w-80 shadow-lg border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Nova versão disponível</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Uma atualização da aplicação está disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleReload} className="w-full">
            Atualizar agora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
