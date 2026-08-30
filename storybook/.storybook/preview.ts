import type { Preview } from "@storybook/react";
import { themes } from "@storybook/theming";
import { useEffect } from "react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    darkMode: {
      dark: { ...themes.dark, appBg: "black" },
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

  decorators: [
    (Story) => {
      useEffect(() => {
        const handler = (event: MessageEvent) => {
          // ✅ security fix: validate message
          if (!event.data || event.data.type !== "THEME_CHANGE") return;

          const { isDark, styles } = event.data;

          const root = document.documentElement;

          root.classList.toggle("dark", isDark);
          root.classList.toggle("light", !isDark);

          if (styles?.background) {
            document.body.style.background = styles.background;
            root.style.background = styles.background;
          }
        };

        window.addEventListener("message", handler);

        // initial sync (safe)
        try {
          if (window.parent && window.parent !== window) {
            const parentDark =
              window.parent.document.documentElement.classList.contains("dark");

            const root = document.documentElement;

            root.classList.toggle("dark", parentDark);
            root.classList.toggle("light", !parentDark);

            const bg = parentDark ? "#0b0d0f" : "transparent";
            document.body.style.background = bg;
            root.style.background = bg;
          }
        } catch {
          // cross-origin safe
        }

        return () => {
          window.removeEventListener("message", handler);
        };
      }, []);

      return Story();
    },
  ],
};

export default preview;
