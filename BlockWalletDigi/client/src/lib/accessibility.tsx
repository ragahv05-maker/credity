/**
 * Accessibility Utilities
 *
 * Helper functions and hooks for improving accessibility
 */

import { useEffect, useCallback, useRef } from "react";

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
) {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only"; // Screen reader only
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowKeys?: (direction: "up" | "down" | "left" | "right") => void,
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "Enter":
          if (onEnter) {
            event.preventDefault();
            onEnter();
          }
          break;
        case "Escape":
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case "ArrowUp":
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys("up");
          }
          break;
        case "ArrowDown":
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys("down");
          }
          break;
        case "ArrowLeft":
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys("left");
          }
          break;
        case "ArrowRight":
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys("right");
          }
          break;
      }
    },
    [onEnter, onEscape, onArrowKeys],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean,
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element
    firstElement?.focus();

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [containerRef, isActive]);
}

/**
 * Skip navigation link component
 */
export function SkipNavLink({
  href = "#main-content",
  children = "Skip to main content",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </a>
  );
}

/**
 * Live region for dynamic content updates
 */
export function useLiveRegion() {
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const region = document.createElement("div");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.className = "sr-only";
    document.body.appendChild(region);
    regionRef.current = region;

    return () => {
      if (regionRef.current) {
        document.body.removeChild(regionRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string) => {
    if (regionRef.current) {
      regionRef.current.textContent = message;
    }
  }, []);

  return { announce };
}

/**
 * Reduced motion preference hook
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// Import React for the hook
import React from "react";
