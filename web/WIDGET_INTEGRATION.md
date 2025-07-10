# Help Widget Integration Guide

## Overview

The Help Widget provides contextual help within MP3 and POS2 applications. It displays a floating help button that opens a sidebar with relevant help content based on the current context.

## Quick Start

### 1. Script Tag Integration

Add the widget script to your HTML:

```html
<script src="https://your-domain.com/widget/help-widget.js"></script>
<script>
  HelpWidget.init({
    apiKey: 'your-api-key',
    appId: 'MP3', // or 'POS2'
    position: 'bottom-right',
    theme: 'light'
  });
</script>
```

### 2. NPM Package Integration (Future)

```javascript
import { HelpWidget } from '@yourcompany/help-widget';

HelpWidget.initialize({
  apiKey: 'your-api-key',
  appId: 'MP3',
  contextProvider: () => getCurrentPageContext()
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | API key for authentication |
| `appId` | string | required | Application ID ('MP3' or 'POS2') |
| `position` | string | 'bottom-right' | Widget position ('bottom-right', 'bottom-left', 'top-right', 'top-left') |
| `theme` | string | 'light' | Theme ('light' or 'dark') |
| `apiBaseUrl` | string | auto | Base URL for API calls |
| `cacheExpiry` | number | 300000 | Cache expiry in milliseconds (5 minutes) |

## Context Detection

The widget can receive context updates from your application:

```javascript
// Update context when user navigates to different sections
HelpWidget.updateContext({
  app: 'MP3',
  page: '/inventory',
  module: 'inventory',
  userRole: 'manager',
  businessType: 'retail'
});
```

### Context Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `app` | string | Application name ('MP3' or 'POS2') |
| `page` | string | Current page path |
| `module` | string | Current module/section |
| `userRole` | string | User's role |
| `businessType` | string | Type of business |

## API Endpoints

The widget communicates with these endpoints:

- `POST /api/widget/contextual` - Get context-aware content
- `GET /api/widget/default` - Get default/recent content
- `GET /api/widget/search?q=query` - Search for content

### Authentication

All API calls require an `X-API-Key` header:

```
X-API-Key: your-api-key
```

## Context Mapping

The widget maps different contexts to relevant help content:

| Module | Search Terms | Categories |
|--------|-------------|------------|
| `inventory` | inventory management, stock levels, product catalog | inventory |
| `orders` | order processing, payment handling, shipping setup | orders |
| `reports` | reports, analytics, dashboard, metrics | reports |
| `customers` | customer management, client database | customers |
| `settings` | settings, configuration, setup, preferences | settings |

## Styling Customization

The widget uses CSS custom properties for theming:

```css
.help-widget__button {
  background: var(--widget-primary-color, #007bff);
  color: var(--widget-text-color, white);
}

.help-widget__sidebar {
  background: var(--widget-bg-color, white);
  color: var(--widget-text-color, #333);
}
```

## Performance Considerations

- Widget size: ~15KB gzipped
- Load time: < 200ms
- Cache expiry: 5 minutes
- Minimal impact on page performance

## Security

- API key authentication required
- CORS headers configured for widget domain
- Content sanitization for XSS prevention
- Rate limiting on API endpoints

## Troubleshooting

### Widget not loading
- Check if script URL is accessible
- Verify API key is valid
- Check browser console for errors

### No content showing
- Ensure articles exist in database
- Check API key permissions
- Verify context is being sent correctly

### Styling issues
- Check for CSS conflicts
- Verify theme configuration
- Test in different browsers

## Development

### Local Development

1. Start the development server:
```bash
npm run dev
```

2. Visit the widget demo page:
```
http://localhost:3000/widget-demo
```

3. Test different contexts and functionality

### Building for Production

The widget script is served from `/public/widget/help-widget.js` and can be accessed at:
```
https://your-domain.com/widget/help-widget.js
```

## Support

For technical support or questions about widget integration, contact the development team. 