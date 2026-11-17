import { useLayoutEffect } from 'react';

let activeLockCount = 0;
let savedScrollY = 0;
let savedBodyStyles: Partial<CSSStyleDeclaration> | null = null;
let savedHtmlOverscroll = '';

/**
 * Locks only the background document. No global touchmove/wheel handlers are
 * installed, so map gestures, form scrolling, and text selection keep working.
 * A reference count prevents nested overlays from unlocking each other.
 */
function acquireScrollLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (activeLockCount === 0) {
    const { body, documentElement } = document;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    savedHtmlOverscroll = documentElement.style.overscrollBehavior;
    savedBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      overscrollBehavior: body.style.overscrollBehavior,
    };

    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    documentElement.style.overscrollBehavior = 'none';
    body.classList.add('zaven-modal-open');
  }

  activeLockCount += 1;
}

function releaseScrollLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (activeLockCount <= 0) return;

  activeLockCount -= 1;
  if (activeLockCount !== 0 || !savedBodyStyles) return;

  const { body, documentElement } = document;
  Object.assign(body.style, savedBodyStyles);
  savedBodyStyles = null;
  documentElement.style.overscrollBehavior = savedHtmlOverscroll;
  savedHtmlOverscroll = '';
  body.classList.remove('zaven-modal-open');
  window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' as ScrollBehavior });
}

export function useBodyScrollLock(isLocked: boolean): void {
  useLayoutEffect(() => {
    if (!isLocked) return;
    acquireScrollLock();
    return releaseScrollLock;
  }, [isLocked]);
}
