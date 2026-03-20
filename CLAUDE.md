# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QFAITool is a Single Page Application (SPA) built with vanilla JavaScript and Vite. It provides utility tools for domain conversion and whitelist comparison with a modern, responsive UI.

## Development Commands

- `npm run dev` - Start Vite dev server (runs on port 3000)
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build

## Architecture

### Tech Stack
- **Framework**: Vanilla JavaScript ES6+ (no framework dependency)
- **Build**: Vite
- **Styling**: Custom CSS with CSS variables for theming
- **Routing**: Custom hash-based router (`src/router.js`)
- **i18n**: Custom internationalization system (`src/i18n.js`)

### Project Structure

```
src/
├── main.js              # App entry point - registers routes, initializes theme/i18n
├── router.js            # Custom hash router implementation
├── i18n.js             # Internationalization (zh-CN, zh-TW, en)
├── theme.js            # Theme management (light/dark mode with localStorage persistence)
├── components/         # Reusable UI components
│   ├── header.js       # Navigation header with language/theme selectors
│   └── tool-card.js    # Tool display cards for home page
├── pages/              # Page-specific components
│   ├── home.js         # Home page with tool grid
│   ├── domain-converter.js  # Domain conversion tool
│   ├── whitelist-diff.js    # Whitelist comparison tool
│   ├── youtube-downloader.js # YouTube video downloader
│   ├── qr-scanner.js         # QR code scanner (supports image/PDF)
│   └── image-compressor.js   # Image compression tool
├── styles/             # Global styles
│   └── index.css       # Main stylesheet with design tokens (CSS variables)
└── tools/
    └── registry.js     # Tool registry for managing available tools
```

### Key Architecture Patterns

1. **Registry Pattern**: Tools are centrally registered in `src/tools/registry.js`. Each tool has:
   - `id`: Unique identifier
   - `nameKey`, `descKey`: i18n translation keys
   - `icon`: Emoji icon
   - `tags`: Array of tags for filtering
   - `route`: URL path

2. **Hash Routing**: Custom router in `src/router.js` provides:
   - `register(path, handler)` - Register route handlers
   - `navigate(path)` - Programmatic navigation
   - `start()` - Initialize routing on hash changes

3. **Component Rendering**: Pages use a function-based rendering pattern:
   - Page components export a `render()` function that returns HTML string
   - Event binding is handled via `bindEvents()` functions
   - Components render into existing DOM elements (`#page-content`)

4. **Theme System**: CSS variables for light/dark themes in `src/styles/index.css`:
   - Root-level CSS variables define color tokens
   - `data-theme="dark"` attribute on `<html>` toggles dark mode
   - Theme preference persisted in localStorage

5. **i18n System**: Translation keys in `src/i18n.js`:
   - Key-based translations: `t('heroTitle')`
   - Language auto-detection from browser
   - Language preference persisted in localStorage

### Adding a New Tool

To add a new tool:

1. Create page component in `src/pages/[tool-name].js`:
   ```javascript
   export function render[ToolName](router) {
     const pageContent = document.getElementById('page-content');
     pageContent.innerHTML = `/* HTML content */`;
     bind[ToolName]Events();
   }
   ```

2. Register the tool in `src/tools/registry.js`:
   ```javascript
   {
     id: 'tool-id',
     nameKey: 'tool.tool-id.name',
     descKey: 'tool.tool-id.desc',
     icon: '🔧',
     tags: ['category'],
     route: '/tool-id',
   }
   ```

3. Add translations to `src/i18n.js` for all languages

4. Register route in `src/main.js`:
   ```javascript
   import { render[ToolName] } from './pages/[tool-name].js';
   router.register('/tool-id', (path) => renderLayout(render[ToolName], path));
   ```

5. Add SEO metadata to `pageMeta` object in `src/main.js`

### SEO Configuration

SEO meta tags are defined in `index.html` and dynamically updated via the `pageMeta` object in `src/main.js`. When adding new pages, update `pageMeta` with title and description.

### Design System

- **Colors**: Light blue/teal accents (#38bdf8, #0ea5e9)
- **Typography**: Inter font family
- **Spacing**: Consistent via CSS variables
- **Components**: Reusable button, input, card patterns
- **Styling**: Glassmorphism with smooth animations

### Language and Theme

- Language and theme are managed globally via `src/i18n.js` and `src/theme.js`
- Both use localStorage for persistence
- Theme toggle updates `data-theme` attribute on `<html>` element
- Language change triggers page re-render via router
