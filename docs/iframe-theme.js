(function () {
  const PROCESSED_ATTR = "data-theme-listener-added";

  function updateIframesForDarkMode() {
    const isDark = document.documentElement.classList.contains("dark");

    document
      .querySelectorAll('iframe[src*="chromatic.com/iframe.html"]')
      .forEach((iframe) => {
        iframe.style.background = "transparent";
        iframe.allowTransparency = true;

        const sendThemeMessage = () => {
          try {
            const message = {
              type: "THEME_CHANGE",
              isDark: isDark,
              styles: {
                background: isDark ? "#0b0d0f" : "transparent",
              },
            };

            const targetOrigin = new URL(iframe.src).origin;
            iframe.contentWindow.postMessage(message, targetOrigin);
          } catch (e) {
            console.warn("Could not send message to iframe:", e);
          }
        };

        // Prevent adding multiple event listeners
        if (!iframe.hasAttribute(PROCESSED_ATTR)) {
          iframe.addEventListener("load", () => {
            setTimeout(sendThemeMessage, 100);
          });
          iframe.setAttribute(PROCESSED_ATTR, "true");
        }

        // Initial message send
        sendThemeMessage();
      });
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class" &&
        mutation.target === document.documentElement
      ) {
        updateIframesForDarkMode();
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateIframesForDarkMode);
  } else {
    updateIframesForDarkMode();
  }
})();
