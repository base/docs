(function () {
  function updateIframesForDarkMode() {
    const isDark = document.documentElement.classList.contains("dark");

    document.querySelectorAll('iframe[src*="chromatic.com/iframe.html"]').forEach((iframe) => {
      iframe.style.background = "transparent";
      iframe.allowTransparency = true;

      // Use postMessage to communicate with the iframe since we can't access contentDocument due to CORS
      const sendThemeMessage = () => {
        try {
          const message = {
            type: 'THEME_CHANGE',
            isDark: isDark,
            styles: {
              background: isDark ? '#0b0d0f' : 'transparent' // transparent for light mode
            }
          };
          iframe.contentWindow.postMessage(message, '*');
        } catch (e) {
          console.warn("Could not send message to iframe:", e);
        }
      };

      // Send message immediately if iframe might be loaded
      sendThemeMessage();

      // Also send message when iframe loads
      iframe.addEventListener("load", () => {
        // Add a small delay to ensure iframe is ready
        setTimeout(sendThemeMessage, 100);
      });
    });
  }

  // Listen for theme changes on the parent document
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'class' && 
          mutation.target === document.documentElement) {
        updateIframesForDarkMode();
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateIframesForDarkMode);
  } else {
    setTimeout(updateIframesForDarkMode, 100);
    // TODO: add Storybook with Darkmode enabled
    let themeChangeCount = 0;
    const themeChangeInterval = setInterval(() => {
      if (themeChangeCount < 2) {
        updateIframesForDarkMode();
        themeChangeCount++;
      } else {
        clearInterval(themeChangeInterval);
      }
    }, 1000);
  }
})();
