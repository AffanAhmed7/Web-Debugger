# Universal Web Debugger Overlay

## Project Overview
The Universal Web Debugger is a high-performance, zero-interference Chrome extension designed to bring advanced developer tools directly into the browser viewport. Built with TypeScript and Vite, it acts as a lightweight, in-page hover inspector that allows developers to analyze, debug, and mutate DOM elements in real time without opening a separate DevTools window. 

The tool is engineered for modern web development, offering deep integrations like framework detection (React, Vue, Svelte), accessibility compliance checking, and real-time session recording via `rrweb`.

## Key Technical Features

### 🔍 Real-Time Hover Inspector & Box Model Analysis
- Developed a highly optimized, passive event listener-driven hover overlay that instantly highlights DOM elements.
- Visualizes precise box-model metrics (margin, padding, border, dimensions) and computes deep CSS tree history in real-time.
- Utilizes intelligent z-index and DOM-depth traversal to accurately select the most specific child element, even in complex overlapping layouts.

### 🧠 Intelligent Side Panel & Framework Detection
- Clicking an element "locks" it and opens a dynamic Side Panel injected seamlessly via the Shadow DOM to prevent style leakage.
- **Performance Vitals:** Analyzes runtime performance metrics such as Cumulative Layout Shift (CLS), Largest Contentful Paint (LCP), and Long Tasks, instantly surfacing frontend bottlenecks.
- **Framework Awareness:** Automatically detects if the locked component is built using React, Vue, Angular, or Svelte, providing context-aware debugging advice.

### ♿ Accessibility (A11y) Engine
- Built-in color contrast engine that calculates luminance based on WCAG standards.
- Automatically audits background and text colors to flag contrast ratio failures (e.g., AA/AAA ratings).
- Includes a "Fix Contrast" algorithm that mathematically suggests and injects the nearest accessible color in real-time.

### 🎨 Live Style Editor & Mutation History
- Allows developers to modify CSS properties (typography, spacing, layout helpers like flex/grid) directly from the UI.
- Implemented a robust `StyleHistory` state manager that tracks all DOM mutations, enabling seamless **Undo/Redo** functionality for design experimentation.
- Allows developers to effortlessly force CSS pseudo-states (`:hover`, `:focus`, `:active`) to test interactive elements without manual user input.

### 📹 Session Recording & Viewport Annotation
- Integrated `rrweb` to enable full session recording, allowing engineers to capture user flows and export diagnostic reports for reproducible bug tracking.
- Features an integrated HTML5 Canvas `Annotator` for taking screenshots of the viewport and drawing direct visual feedback over the UI.

## Technical Stack
- **Languages:** TypeScript, HTML5, CSS3
- **Build Tools:** Vite, Node.js
- **Browser APIs:** Chrome Extensions API (Manifest V3), Shadow DOM, MutationObserver
- **Libraries:** `rrweb` (session recording)

## Impact & Value
This project demonstrates strong proficiency in advanced DOM manipulation, browser APIs, and state management. It highlights an ability to build developer-centric tooling focused on performance optimization, accessibility, and improving the frontend debugging lifecycle.
