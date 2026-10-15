(function () {
  const IFRAME_SELECTOR = 'iframe[src*="chromatic.com/iframe.html"]';
  const MESSAGE_TYPE = "THEME_CHANGE";

  function getIsDark() {
    return document.documentElement.classList.contains("dark");
  }

  function sendThemeMessage(iframe, isDark) {
    try {
      if (!iframe.contentWindow) return;

      iframe.contentWindow.postMessage(
        {
          type: MESSAGE_TYPE,
          isDark,
          styles: {
            background: isDark ? "#0b0d0f" : "transparent",
          },
        },
        "*" // consider restricting origin if possible
      );
    } catch (e) {
      console.warn("Could not send message to iframe:", e);
    }
  }

  function setupIframe(iframe) {
    const isDark = getIsDark();

    iframe.style.background = "transparent";
    iframe.setAttribute("allowTransparency", "true");

    // prevent duplicate listeners
    if (iframe.dataset.themeListenerAttached === "true") return;
    iframe.dataset.themeListenerAttached = "true";

    const onLoad = () => {
      setTimeout(() => sendThemeMessage(iframe, getIsDark()), 100);
    };

    iframe.addEventListener("load", onLoad);

    // initial attempt
    sendThemeMessage(iframe, isDark);
  }

  function updateIframes() {
    const iframes = document.querySelectorAll(IFRAME_SELECTOR);
    iframes.forEach(setupIframe);
  }

  // Observe class changes on <html>
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        updateIframes();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  function init() {
    updateIframes();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  // optional: cleanup on page unload (good practice)
  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
