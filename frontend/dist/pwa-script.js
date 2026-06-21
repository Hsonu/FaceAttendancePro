/**
 * AttendEase PWA Install Handler
 * Intercepts default installation flow, displays premium glassmorphic modal,
 * and manages user choices with 24-hour reminder suppression.
 */

(function () {
  let deferredPrompt = null;
  const STORAGE_KEY = 'pwa-prompt-dismissed-time';
  const REMINDER_HOURS = 24;

  // 1. Service Worker Automatic Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('✨ [PWA] Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ [PWA] Service Worker registration failed:', error);
        });
    });
  }

  // 2. Initialize PWA Install Prompt Event Listener
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the default browser mini-infobar prompt
    event.preventDefault();
    
    // Store the event for triggering later
    deferredPrompt = event;
    console.log('📥 [PWA] Install prompt intercepted.');

    // Check if the user dismissed it within the last 24 hours
    if (shouldShowPrompt()) {
      showInstallPrompt();
    }
  });

  // 3. Handle App Installed Event
  window.addEventListener('appinstalled', (event) => {
    console.log('🎉 [PWA] AttendEase installed successfully!');
    hideInstallPrompt();
    deferredPrompt = null;
  });

  // Helper: check if we should display the prompt
  function shouldShowPrompt() {
    const dismissedTime = localStorage.getItem(STORAGE_KEY);
    if (!dismissedTime) return true;

    const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60);
    return hoursSinceDismissed >= REMINDER_HOURS;
  }

  // Helper: Display UI Prompt
  function showInstallPrompt() {
    const promptEl = document.getElementById('pwa-install-prompt');
    if (promptEl) {
      promptEl.classList.remove('pwa-prompt-hidden');
    }
  }

  // Helper: Hide UI Prompt
  function hideInstallPrompt() {
    const promptEl = document.getElementById('pwa-install-prompt');
    if (promptEl) {
      promptEl.classList.add('pwa-prompt-hidden');
    }
  }

  // Bind events once the DOM is ready
  function initDOMEvents() {
    const installBtn = document.getElementById('pwa-btn-install');
    const laterBtn = document.getElementById('pwa-btn-later');

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        // Hide custom prompt UI
        hideInstallPrompt();

        // Show browser's native install dialog
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`👤 [PWA] User response to installation: ${outcome}`);

        // We've used the prompt; it can't be used again
        deferredPrompt = null;
      });
    }

    if (laterBtn) {
      laterBtn.addEventListener('click', () => {
        // Hide custom prompt UI
        hideInstallPrompt();

        // Save current timestamp to ignore the prompt for 24 hours
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        console.log(`⏳ [PWA] Dismissed. Reminding again in ${REMINDER_HOURS} hours.`);
      });
    }
  }

  // Initialize event bindings
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOMEvents);
  } else {
    initDOMEvents();
  }
})();
