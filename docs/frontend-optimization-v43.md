# Frontend Optimization Log v43

## Goal

Eliminate button flicker, jumping, repeated layout shifts, and unnecessary repaint loops in the PWA frontend.

## Root Causes Fixed

1. Multiple modules used repeated timers to scan and rewrite the same `.tool-grid`.
   Original pattern:
   ```js
   document.addEventListener("DOMContentLoaded", () => setInterval(addEntrances, 500));
   ```
   Revised pattern:
   ```js
   document.addEventListener("DOMContentLoaded", addEntrances);
   window.addEventListener("ui:stabilize", addEntrances);
   ```
   Files:
   - `admin-modules.js`
   - `finance-reconciliation.js`
   - `screen-layout-manager.js`
   - `module-permission-dashboard.js`
   - `shortcut-manager.js`
   - `brand-manager.js`
   - `role-manager.js`
   - `menu-reservation.js`

2. Front workspace buttons had several competing owners.
   Original behavior:
   - `screen-layout-manager.js` rebuilt the workspace.
   - `shortcut-manager.js`, `menu-reservation.js`, and `module-permission-dashboard.js` also inserted buttons.
   Revised behavior:
   - When `screenLayoutManager` exists, it is the only owner of the front workspace buttons.

3. Rapid repeated clicks could trigger duplicate renders.
   Added:
   ```js
   ui-stability-guard.js
   ```
   This adds a 320ms button click lock and schedules one controlled `ui:stabilize` event after navigation/click/input changes.

4. Layout-affecting animation risk.
   Revised CSS limits button transitions to:
   - `transform`
   - `box-shadow`
   - `border-color`
   - `opacity`

5. Button dimensions were made stable.
   Added fixed constraints:
   - `width: 100%`
   - `min-width: 0`
   - `min-height`
   - `contain: layout paint`

## Verification Checklist

- No remaining `setInterval` usage in root frontend JS files.
- `node --check` passed for edited JS files.
- PWA cache upgraded to `car-beauty-pwa-v43`.
- App version upgraded to `v43`.

## Maintenance Rules

- Do not add new `setInterval` loops for UI enhancement.
- Use `window.scheduleUiStabilize()` after route/page changes.
- Only one script should own a workspace grid at a time.
- Buttons must keep stable width/min-height and avoid transitions on width, height, margin, or padding.
- Repeated click actions should use the global click lock instead of local ad hoc timers.
