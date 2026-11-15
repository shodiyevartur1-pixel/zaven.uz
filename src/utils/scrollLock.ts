import { useLayoutEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: Record<string, string> | null = null;
let savedHtmlScrollBehavior = '';
let touchStartY = 0;

const isScrollableOverlayTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-zaven-scroll-area="true"]'));
};

const preventBackgroundScroll = (event: Event) => {
  if (!isScrollableOverlayTarget(event.target)) event.preventDefault();
};

const handleTouchStart = (event: TouchEvent) => {
  touchStartY = event.touches[0]?.clientY ?? 0;
};

const handleTouchMove = (event: TouchEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    event.preventDefault();
    return;
  }
  const area = target.closest<HTMLElement>('[data-zaven-scroll-area="true"]');
  if (!area) {
    event.preventDefault();
    return;
  }
  const style = window.getComputedStyle(area);
  if (!/(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`) || area.scrollHeight <= area.clientHeight) return;
  const deltaY = (event.touches[0]?.clientY ?? touchStartY) - touchStartY;
  const atTop = area.scrollTop <= 0;
  const atBottom = area.scrollTop + area.clientHeight >= area.scrollHeight - 1;
  if ((deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) event.preventDefault();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
    if (!isScrollableOverlayTarget(event.target)) event.preventDefault();
  }
};

const acquireScrollLock = () => {
  lockCount += 1;
  if (lockCount !== 1) return;

  const body = document.body;
  const html = document.documentElement;
  savedScrollY = window.scrollY;
  savedHtmlScrollBehavior = html.style.scrollBehavior;
  savedStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  body.classList.add('zaven-modal-open');
  // Disable the site's global smooth-scroll rule while a dialog is open.
  html.style.scrollBehavior = 'auto';

  document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('keydown', handleKeyDown);
};

const releaseScrollLock = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0 || !savedStyles) return;

  const body = document.body;
  const html = document.documentElement;
  Object.assign(body.style, savedStyles);
  savedStyles = null;
  body.classList.remove('zaven-modal-open');
  document.removeEventListener('wheel', preventBackgroundScroll);
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('keydown', handleKeyDown);
  // The page sets `scroll-behavior: smooth`; restoration must be immediate or
  // closing a modal visibly animates the background from the top of the page.
  window.scrollTo({
    top: savedScrollY,
    left: 0,
    behavior: 'instant' as ScrollBehavior,
  });
  html.style.scrollBehavior = savedHtmlScrollBehavior;
  savedHtmlScrollBehavior = '';
};

export const useBodyScrollLock = (isLocked: boolean) => {
  useLayoutEffect(() => {
    if (!isLocked) return;
    acquireScrollLock();
    return releaseScrollLock;
  }, [isLocked]);
};
