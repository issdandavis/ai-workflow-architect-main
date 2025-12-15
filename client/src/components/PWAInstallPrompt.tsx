import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-4"
      data-testid="pwa-install-banner"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg" data-testid="text-install-title">
            Install AI Hub
          </h3>
          <p className="text-sm text-white/80 mt-1" data-testid="text-install-description">
            Install this app on your device for quick access and offline capabilities.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-white text-indigo-600 hover:bg-white/90"
              data-testid="button-install-app"
            >
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              data-testid="button-dismiss-install"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded"
          aria-label="Dismiss"
          data-testid="button-close-install-banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
