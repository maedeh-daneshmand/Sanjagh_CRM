# Splash + Login restyle (frontend only)

Paste this into Antigravity. Attach `splash_preview.html` as a visual/motion reference (open it in a browser to see the animation; do NOT copy its code blindly, build it with the project's own stack and theme tokens).

```
Frontend-only change: add a branded splash animation and restyle the login page.
Do NOT change any auth/OTP/server logic, the Prisma schema, or routes' behavior.
Decisions already made:
- There is NO sign-up page. Users are created by the admin; login is OTP-only for
  registered phones. The page is called "ورود" (Sign in).
- The splash plays ONCE per browser session (sessionStorage), and can be skipped.
- All colors come from the CURRENT THEME tokens (green theme => green, blue => blue...).

## 1. Splash screen (SplashScreen component)
- Full-screen overlay (fixed, inset-0, top z-index) shown when an unauthenticated user
  lands on /login. Background = a gradient from the theme's --primary to a slightly
  darker shade of it. Must work for every accent palette and in dark mode.
- Center: the wordmark "SANJAGH" appears letter by letter: S, A, N, J, A, G, H. Each
  letter fades in with a small upward move and blur-to-sharp, staggered ~110-130ms.
  dir="ltr", uppercase, wide letter-spacing, bold, white, responsive size.
  Above the text, a small pin icon that drops/scales in just before the letters; below
  it a thin progress line that fills while the letters appear.
- Total about 2.2-2.6 s (never over 3 s), then the overlay slides/fades up revealing
  the login page.
- Show once per session (sessionStorage flag inside try/catch). Click or any key skips.
  Respect prefers-reduced-motion: no letter animation, only a quick fade (<= 400ms).
- No flash of the wrong theme: apply the persisted theme before first paint. Avoid
  layout shift and hydration mismatch (render the overlay client-side after reading the
  flag; the login form stays in the DOM underneath).
- Pure CSS keyframes (Tailwind) or the animation lib already in the project; no heavy deps.
- Accessibility: role="status" with a visually hidden "در حال بارگذاری سنجاق" label;
  no focus trap after dismissal.

## 2. Login page ("ورود")
- Full-screen background in the theme color: soft gradient from --primary with subtle
  decorative shapes (blurred circles or faint pattern). Good in all palettes + dark mode.
- Centered card (glass/elevated, rounded, shadow), RTL Persian:
  - Top: small SANJAGH wordmark (dir="ltr"), title "ورود به سنجاق", subtitle
    "برای ورود شماره موبایل خود را وارد کنید".
  - Step 1: phone input (Latin digits, ltr, placeholder 09xxxxxxxxx) + button
    "دریافت کد ورود".
  - Step 2: 6-digit OTP boxes (auto-advance, paste support, numeric keypad on mobile),
    2-minute countdown with Latin digits, "ارسال مجدد کد" enabled after it ends,
    "ویرایش شماره" link.
  - Friendly Persian errors (wrong code, too many attempts, unknown number) and loading
    states. Keep the existing server actions and error codes.
- A small palette button in the corner to switch accent theme / dark mode before login
  (reuse the existing theme system and persistence).
- Smooth, RTL-aware step transitions.

## 3. After successful login
- Short fade/scale into the dashboard (<= 400ms), no extra splash.
- Logout returns to /login WITHOUT replaying the splash in the same session.

## 4. Quality
- Responsive (mobile to desktop), RTL correct, Latin digits everywhere.
- Vitest/RTL test for the "show once per session" logic.
- Run lint, typecheck, build; list what changed and how to test it.
```

## Test checklist
1. Open the site in a new Incognito window: splash in theme color, letters one by one, then the login page.
2. Refresh: no splash (same session). Close tab and reopen: splash again.
3. Click during the splash: it skips.
4. Switch theme (green/blue/violet/rose) + dark mode, open in a new window: splash and login background follow the theme with no wrong-color flash.
5. Log in (fake provider): smooth transition to the dashboard. Log out: back to login with no splash.
6. Check mobile (DevTools) and reduced-motion.
