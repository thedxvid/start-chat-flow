import { useEffect } from 'react';

interface KeyboardShortcuts {
  onNewChat?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onEscape?: () => void;
}

export function useKeyboard(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        // Only allow Escape key in input fields
        if (event.key === 'Escape' && shortcuts.onEscape) {
          shortcuts.onEscape();
        }
        return;
      }

      // Handle keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            shortcuts.onNewChat?.();
            break;
          case 'f':
            event.preventDefault();
            shortcuts.onSearch?.();
            break;
          case ',':
            event.preventDefault();
            shortcuts.onSettings?.();
            break;
          default:
            break;
        }
      } else if (event.key === 'Escape') {
        shortcuts.onEscape?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}