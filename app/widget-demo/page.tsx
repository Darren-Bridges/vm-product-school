"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HelpWidgetOptions {
  apiKey: string;
  appId: string;
  position: string;
  theme: string;
}

interface HelpWidgetContext {
  app: string;
  page: string;
  module: string;
  userRole: string;
  businessType: string;
}

// Type declaration for the HelpWidget global
declare global {
  interface Window {
    HelpWidget: {
      init: (options: HelpWidgetOptions) => void;
      updateContext: (context: HelpWidgetContext) => void;
    };
  }
}

export default function WidgetDemoPage() {
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    console.log('WidgetDemo: Loading widget script...');
    // Load the widget script
    const script = document.createElement('script');
    script.src = '/widget/help-widget.js';
    script.onload = () => {
      console.log('WidgetDemo: Script loaded successfully');
      setWidgetLoaded(true);
      setTimeout(() => {
        initializeWidget();
      }, 100); // Small delay to ensure script is fully loaded
    };
    script.onerror = (error) => {
      console.error('WidgetDemo: Failed to load script:', error);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup widget if component unmounts
      const widgetContainer = document.getElementById('help-widget-container');
      if (widgetContainer) {
        widgetContainer.remove();
      }
    };
  }, []);

  const initializeWidget = () => {
    console.log('WidgetDemo: Initializing widget...');
    console.log('WidgetDemo: window.HelpWidget exists:', !!window.HelpWidget);
    if (window.HelpWidget) {
      console.log('WidgetDemo: Calling HelpWidget.init...');
      let userRole = undefined;
      try {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user && user.role && user.role.slug) {
            userRole = user.role.slug;
          }
        }
      } catch {
        // Ignore if user not found or parse error
      }
      window.HelpWidget.init({
        apiKey: 'test-api-key-123',
        appId: 'demo',
        position: 'bottom-right',
        theme: 'auto',
        ...(userRole ? { userRole } : {}),
      });
    } else {
      console.error('WidgetDemo: HelpWidget not found on window object');
    }
  };

  const updateContext = (context: HelpWidgetContext) => {
    if (window.HelpWidget) {
      window.HelpWidget.updateContext(context);
    }
  };

  const contexts = [
    {
      name: 'Inventory Management',
      context: {
        app: 'MP3',
        page: '/inventory',
        module: 'inventory',
        userRole: 'manager',
        businessType: 'retail',
      },
    },
    {
      name: 'Order Processing',
      context: {
        app: 'MP3',
        page: '/orders',
        module: 'orders',
        userRole: 'cashier',
        businessType: 'retail',
      },
    },
    {
      name: 'Reports & Analytics',
      context: {
        app: 'MP3',
        page: '/reports',
        module: 'reports',
        userRole: 'admin',
        businessType: 'retail',
      },
    },
    {
      name: 'Customer Management',
      context: {
        app: 'MP3',
        page: '/customers',
        module: 'customers',
        userRole: 'manager',
        businessType: 'retail',
      },
    },
    {
      name: 'Settings & Configuration',
      context: {
        app: 'MP3',
        page: '/settings',
        module: 'settings',
        userRole: 'admin',
        businessType: 'retail',
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8 mt-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Help Widget Demo
          </h1>
          <p className="text-muted-foreground">
            Test the help widget with different contexts. Click the help button in the bottom-right corner to see the widget in action.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contexts.map((item, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Simulate being in the {item.name} module
                </p>
                <Button 
                  onClick={() => updateContext(item.context)}
                  className="w-full"
                  disabled={!widgetLoaded}
                >
                  Set Context
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Widget Status
          </h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Widget Loaded:</span>{' '}
              <span className={widgetLoaded ? 'text-green-600' : 'text-red-600'}>
                {widgetLoaded ? 'Yes' : 'No'}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Click the help button (?) in the bottom-right corner to open the widget
            </p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            How to Use
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>1. Click &quot;Set Context&quot; to simulate being in different parts of the application</p>
            <p>2. Click the help button (?) in the bottom-right corner</p>
            <p>3. Search for help content or browse contextual articles</p>
            <p>4. Click on articles to view them in a new tab</p>
          </div>
        </div>
      </div>
    </div>
  );
} 