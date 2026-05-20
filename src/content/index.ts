import { Inspector } from './inspector';
import { initPerformanceMonitoring, stopPerformanceMonitoring } from '../utils/performanceMonitor';

let inspector: Inspector | null = null;

async function checkAndInit() {
  const state = await chrome.storage.local.get(['enabled', 'blockedDomains']) as { enabled?: boolean, blockedDomains?: string[] };
  const isEnabled = state.enabled ?? true;
  const blockedDomains = state.blockedDomains ?? [];
  const currentDomain = window.location.hostname;

  const shouldBeActive = isEnabled && !blockedDomains.includes(currentDomain);

  if (shouldBeActive) {
    if (!inspector) {
      initPerformanceMonitoring();
      inspector = new Inspector();
      inspector.start();
      console.log('🚀 Universal Web Debugger Overlay Initialized');
    }
  } else {
    if (inspector) {
      inspector.stop();
      stopPerformanceMonitoring();
      inspector = null;
      console.log('💤 Universal Web Debugger Overlay Deactivated');
    }
  }
}

// Cleanup on unload
window.addEventListener('unload', () => {
  if (inspector) {
    inspector.stop();
    inspector = null;
  }
});

// Listen for state changes from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'stateChanged') {
    checkAndInit();
  }
});

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndInit);
} else {
  checkAndInit();
}
