import type { FrameworkInfo } from '../types';

export function detectFramework(): FrameworkInfo {
  // Check for React
  if (!!document.querySelector('[data-reactroot], [data-reactid]') || (window as any).React || (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    return { name: 'React' };
  }

  // Check for Vue
  if (!!document.querySelector('[data-v-count]') || (window as any).Vue || (window as any).__VUE__) {
    return { name: 'Vue' };
  }

  // Check for Svelte
  if (!!document.querySelector('.svelte-') || (window as any).__svelte) {
    return { name: 'Svelte' };
  }

  // Check for Angular
  if (!!document.querySelector('[ng-version], [ng-app], .ng-binding')) {
    return { name: 'Angular' };
  }

  return { name: 'Unknown' };
}
