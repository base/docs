(function () {
  function updateIframesForDarkMode() {
    const isDark = document.documentElement.classList.contains("dark");
    console.log("Dark mode:", isDark);

    document.querySelectorAll('iframe[src*="chromatic.com/iframe.html"]').forEach((iframe) => {
      iframe.style.background = "transparent";
      iframe.allowTransparency = true;
      console.log("Found iframe:", iframe.src);

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
          console.log("Sending theme message to iframe:", message);
          iframe.contentWindow.postMessage(message, '*');
        } catch (e) {
          console.warn("Could not send message to iframe:", e);
        }
      };

      // Send message immediately if iframe might be loaded
      sendThemeMessage();

      // Also send message when iframe loads
      iframe.addEventListener("load", () => {
        console.log("iframe loaded, sending theme message");
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
        console.log("Theme class changed, updating iframes");
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
    updateIframesForDarkMode();
  }
})();
