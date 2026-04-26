import type { DebuggerPlugin, PluginInsight } from '../types';

export class PluginSystem {
  private plugins: DebuggerPlugin[] = [];

  public register(plugin: DebuggerPlugin) {
    this.plugins.push(plugin);
    console.log(`🔌 Plugin registered: ${plugin.name}`);
  }

  public async runAll(el: HTMLElement, context: any): Promise<PluginInsight[]> {
    const insights: PluginInsight[] = [];
    
    for (const plugin of this.plugins) {
      try {
        const results = await plugin.run(el, context);
        if (results && results.length > 0) {
          insights.push({
            pluginName: plugin.name,
            results
          });
        }
      } catch (e) {
        console.error(`❌ Plugin failed: ${plugin.name}`, e);
      }
    }
    
    return insights;
  }
}

// Example SEO Plugin
export const SEOPlugin: DebuggerPlugin = {
  name: 'SEO Audit',
  description: 'Checks for SEO best practices',
  run: async (el) => {
    const results = [];
    if (el instanceof HTMLHeadingElement && el.tagName === 'H1') {
      const h1s = document.querySelectorAll('h1');
      if (h1s.length > 1) {
        results.push({ type: 'warning', title: 'Multiple H1s', message: 'Page should have only one H1 for SEO.' });
      }
    }
    return results;
  }
};

// Example Security Plugin
export const SecurityPlugin: DebuggerPlugin = {
  name: 'Security Shield',
  description: 'Checks for security vulnerabilities',
  run: async (el) => {
    const results = [];
    if (el instanceof HTMLFormElement && !el.action.startsWith('https:')) {
      results.push({ type: 'error', title: 'Unsafe Form', message: 'Form action should be over HTTPS.' });
    }
    return results;
  }
};
