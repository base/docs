import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn, Icon } from '@mintlify/components';
import { ASSISTANT_EVENTS } from './events';

const CHAT_SHEET_MIN_WIDTH = 368;
const CHAT_SHEET_MAX_WIDTH = 576;

export function AssistantSheet() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <AssistantSheetClient />;
}

function AssistantSheetClient() {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(CHAT_SHEET_MIN_WIDTH);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => !prev);
    };

    const handleOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener(ASSISTANT_EVENTS.TOGGLE, handleToggle);
    window.addEventListener(ASSISTANT_EVENTS.OPEN, handleOpen);
    window.addEventListener(ASSISTANT_EVENTS.CLOSE, handleClose);

    return () => {
      window.removeEventListener(ASSISTANT_EVENTS.TOGGLE, handleToggle);
      window.removeEventListener(ASSISTANT_EVENTS.OPEN, handleOpen);
      window.removeEventListener(ASSISTANT_EVENTS.CLOSE, handleClose);
    };
  }, [handleClose]);

  useEffect(() => {
    if (isMobile && isOpen) {
      const scrollY = window.scrollY;

      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.height = '100%';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.height = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, isOpen]);

  const isMaximized = width >= CHAT_SHEET_MAX_WIDTH;

  const toggleMaximize = useCallback(() => {
    setWidth(isMaximized ? CHAT_SHEET_MIN_WIDTH : CHAT_SHEET_MAX_WIDTH);
  }, [isMaximized]);

  const getOuterClassName = () => {
    if (isMobile) {
      return 'fixed inset-0 z-[100]';
    }
    return cn('sticky top-0 h-screen shrink-0 z-[50]', 'bg-white');
  };

  const sheetContent = (
    <div
      suppressHydrationWarning
      className={cn(getOuterClassName(), 'print:hidden')}
      style={{
        width: isMobile ? undefined : isOpen ? `${width}px` : 0,
        minWidth: isMobile || !isOpen ? undefined : `${CHAT_SHEET_MIN_WIDTH}px`,
        maxWidth: isMobile || !isOpen ? undefined : `${CHAT_SHEET_MAX_WIDTH}px`,
        marginLeft: !isMobile && isOpen ? '32px' : undefined,
        pointerEvents: isMobile && !isOpen ? 'none' : undefined,
        overflow: !isOpen ? 'hidden' : undefined,
        visibility: !isOpen ? 'hidden' : undefined,
      }}
    >
      {isMobile && (
        <div
          className={cn(
            'absolute inset-0 bg-black/40 z-1',
            isOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={handleClose}
        />
      )}

      <div
        ref={sheetRef}
        className={cn(
          'flex flex-col overflow-hidden shrink-0',
          isMobile
            ? 'overscroll-contain bg-white z-10'
            : 'h-full bg-white border-l border-gray-200',
        )}
        style={
          isMobile
            ? {
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                height: '85vh',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
              }
            : undefined
        }
      >
        {isMobile && (
          <div className="flex justify-center pt-3 touch-none">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        )}
        <div
          className={cn(
            'w-full flex flex-col flex-1 min-h-0',
            isMobile ? 'pt-0' : 'pt-3',
          )}
        >
          <div className="flex items-center justify-between pb-3 px-4">
            <div className="flex items-center gap-2">
              <Icon
                icon="sparkles"
                iconLibrary="lucide"
                color="var(--primary)"
                size={20}
              />
              <span className="font-medium text-gray-900">Assistant</span>
            </div>

            <div className="flex items-center gap-1">
              {!isMobile && (
                <button
                  onClick={toggleMaximize}
                  className="group size-8 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                  aria-label={isMaximized ? 'Minimize' : 'Maximize'}
                >
                  <span className="flex items-center justify-center text-gray-500 group-hover:text-gray-700">
                    {isMaximized ? (
                      <Icon
                        icon="minimize-2"
                        iconLibrary="lucide"
                        size={14}
                        color="currentColor"
                      />
                    ) : (
                      <Icon
                        icon="maximize-2"
                        iconLibrary="lucide"
                        size={14}
                        color="currentColor"
                      />
                    )}
                  </span>
                </button>
              )}
              <button
                onClick={handleClose}
                className="group size-8 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <span className="flex items-center justify-center text-gray-500 group-hover:text-gray-700">
                  <Icon
                    icon="x"
                    iconLibrary="lucide"
                    size={16}
                    color="currentColor"
                  />
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col flex-1 overflow-y-auto px-5 min-h-0">
            <div className="flex-1" />
            <div className="flex flex-col items-center text-sm py-8">
              <p className="text-gray-400 text-xs text-center">
                Configure your Mintlify API keys in .env to enable the AI assistant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return createPortal(sheetContent, document.body);
  }

  return sheetContent;
}
