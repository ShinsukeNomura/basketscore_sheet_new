import {
  classifyPointerGesture,
  isTeamDefLongPressSwipe,
  TEAM_DEF_ARMED_SWIPE_MIN_X,
  TEAM_DEF_LONG_PRESS_MS,
  type TeamDefSwipeDirection,
} from '@/lib/playerGesture';

export interface TeamDefGestureOptions {
  direction: TeamDefSwipeDirection;
  onLongPressSwipe: () => void;
  onTap: () => void;
  tapDisabled?: boolean;
}

/** ボタン長押し＋スワイプ（window追跡で scroll / pointercancel に強い） */
export function attachTeamDefGesture(
  target: HTMLElement,
  options: TeamDefGestureOptions,
): () => void {
  let start: { x: number; y: number; t: number } | null = null;
  let armed = false;
  let fired = false;
  let activePointerId = -1;
  let armTimer: ReturnType<typeof setTimeout> | null = null;

  const clearArmTimer = () => {
    if (armTimer) {
      clearTimeout(armTimer);
      armTimer = null;
    }
  };

  const detachWindow = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };

  const reset = () => {
    clearArmTimer();
    detachWindow();
    start = null;
    armed = false;
    activePointerId = -1;
  };

  const fireLongPress = () => {
    if (fired) return;
    fired = true;
    if (navigator.vibrate) navigator.vibrate(28);
    options.onLongPressSwipe();
    reset();
  };

  const matchesDirection = (dx: number, relaxed: boolean) => {
    if (options.direction === 'left') {
      if (dx < -TEAM_DEF_ARMED_SWIPE_MIN_X) return true;
      return relaxed && dx <= 0;
    }
    if (dx > TEAM_DEF_ARMED_SWIPE_MIN_X) return true;
    return relaxed && dx >= 0;
  };

  const trySwipe = (clientX: number, clientY: number, relaxed: boolean) => {
    if (!start || fired) return false;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    const held = Date.now() - start.t;
    if (isTeamDefLongPressSwipe(dx, dy, held, options.direction, armed)) {
      fireLongPress();
      return true;
    }
    if ((armed || held >= TEAM_DEF_LONG_PRESS_MS) && matchesDirection(dx, relaxed)) {
      fireLongPress();
      return true;
    }
    return false;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;
    trySwipe(e.clientX, e.clientY, true);
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;
    if (fired) {
      reset();
      return;
    }
    if (!trySwipe(e.clientX, e.clientY, true) && start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!options.tapDisabled && classifyPointerGesture(dx, dy) === 'tap') {
        fired = true;
        if (navigator.vibrate) navigator.vibrate(18);
        options.onTap();
      }
    }
    reset();
  };

  const onCancel = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;
    if (!fired && armed) {
      fireLongPress();
      return;
    }
    reset();
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    reset();
    fired = false;
    start = { x: e.clientX, y: e.clientY, t: Date.now() };
    activePointerId = e.pointerId;
    armed = false;
    armTimer = setTimeout(() => {
      armed = true;
      if (navigator.vibrate) navigator.vibrate(12);
    }, TEAM_DEF_LONG_PRESS_MS);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  target.addEventListener('pointerdown', onDown, { passive: false });

  return () => {
    target.removeEventListener('pointerdown', onDown);
    reset();
    fired = false;
  };
}
