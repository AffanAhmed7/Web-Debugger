import { Inspector } from './inspector';
import { initPerformanceMonitoring } from '../utils/performanceMonitor';

let inspector: Inspector | null = null;

function init() {
  if (inspector) return;
  
  initPerformanceMonitoring();
  inspector = new Inspector();
  inspector.start();
  
  console.log('🚀 Universal Web Debugger Overlay Initialized');
}

// Cleanup on unload
window.addEventListener('unload', () => {
  if (inspector) {
    inspector.stop();
    inspector = null;
  }
});

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
