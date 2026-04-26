export interface BoxMetrics {
  width: number;
  height: number;
  top: number;
  left: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  border: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ElementInfo {
  tagName: string;
  id: string;
  classList: string[];
  metrics: BoxMetrics;
  computedStyles: ComputedStyles;
  analysis: ElementAnalysis;
  performance: PerformanceData;
  framework?: FrameworkInfo;
  plugins: PluginInsight[];
}

export interface PluginInsight {
  pluginName: string;
  results: { type: string; title: string; message: string }[];
}

export interface DebuggerPlugin {
  name: string;
  description: string;
  run: (el: HTMLElement, context: any) => Promise<any>;
}

export interface Command {
  id: string;
  name: string;
  shortcut?: string;
  action: () => void;
}

export interface ReportMetadata {
  id: string;
  timestamp: string;
  url: string;
  framework: string;
}

export interface FrameworkInfo {
  name: 'React' | 'Vue' | 'Angular' | 'Svelte' | 'Unknown';
  version?: string;
}

export interface SessionEvent {
  timestamp: number;
  type: string;
  data: any;
}

export interface PerformanceData {
  cls: number;
  longTasks: number;
  lcp: number;
  bottlenecks: Bottleneck[];
}

export interface Bottleneck {
  type: 'loading' | 'scripting' | 'rendering';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export interface ResourceMetric {
  name: string;
  type: string;
  duration: number;
  size: number;
  transferSize: number;
}

export interface ElementAnalysis {
  rules: CssRule[];
  anomalies: Anomaly[];
  a11y: A11yIssue[];
}

export interface CssRule {
  selector: string;
  source: string;
  isOverridden: boolean;
  declarations: { property: string; value: string }[];
}

export interface Anomaly {
  type: 'warning' | 'error';
  title: string;
  description: string;
}

export interface A11yIssue {
  type: 'warning' | 'error';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComputedStyles {
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight: string;
  display: string;
  margin: string;
  padding: string;
}

export interface StyleMutation {
  element: HTMLElement;
  property: keyof CSSStyleDeclaration;
  oldValue: string;
  newValue: string;
}
