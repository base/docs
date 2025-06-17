import type { Preview } from "@storybook/react";
import { themes } from "@storybook/theming";
import "../src/app/globals.css";

// Extend Window interface to include our custom property
declare global {
  interface Window {
    __themeListenerAdded?: boolean;
  }
}

const preview: Preview = {
  parameters: {
    darkMode: {
      // Override the default dark theme
      dark: { ...themes.dark, appBg: "black" },
      // Override the default light theme
      light: { ...themes.normal, appBg: "white" },
      darkClass: "dark",
      lightClass: "light",
      stylePreview: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
  // Add custom script to handle theme messages from parent window
  decorators: [
    (Story) => {
      // Add the message listener script only once
      if (typeof window !== "undefined" && !window.__themeListenerAdded) {
        window.__themeListenerAdded = true;

        const script = document.createElement("script");
        script.textContent = `
          (function() {            
            // Listen for theme messages from parent window
            window.addEventListener('message', function(event) {              
              if (event.data && event.data.type === 'THEME_CHANGE') {
                const { isDark, styles } = event.data;

                // Apply dark/light class to html element
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
                
                // Apply background styles
                if (styles && styles.background) {
                  // Apply the background (either #0b0d0f for dark or transparent for light)
                  document.body.style.background = styles.background;
                  document.documentElement.style.background = styles.background;
                }
              }
            });
            
            // Also check if parent window has dark mode on initial load
            try {
              if (window.parent && window.parent !== window) {
                const parentHasDark = window.parent.document.documentElement.classList.contains('dark');
                if (parentHasDark) {
                  document.documentElement.classList.add('dark');
                  document.body.style.background = '#0b0d0f';
                  document.documentElement.style.background = '#0b0d0f';
                } else {
                  document.documentElement.classList.add('light');
                  document.body.style.background = 'transparent';
                  document.documentElement.style.background = 'transparent';
                }
              }
            } catch (e) {
              console.error('Cannot access parent document (expected for cross-origin)');
            }
          })();
        `;
        document.head.appendChild(script);
      }

      return Story();
    },
  ],
};

export default preview;
