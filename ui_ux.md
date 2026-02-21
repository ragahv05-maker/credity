# CREDITY UI/UX SPECIFICATION

## Complete Design System & Screen-by-Screen Blueprint

**Version:** 1.0  
**Date:** December 26, 2025  
**Author:** Credity Design Team

---

# PART 1: DESIGN SYSTEM

## 1.1 COLOR PALETTE

### Primary Colors

| Name              | Hex       | RGB                | Usage                           |
| ----------------- | --------- | ------------------ | ------------------------------- |
| **Credity Blue**  | `#2563EB` | rgb(37, 99, 235)   | Primary actions, headers, CTAs  |
| **Trust Green**   | `#10B981` | rgb(16, 185, 129)  | Success states, verified badges |
| **Warning Amber** | `#F59E0B` | rgb(245, 158, 11)  | Pending states, warnings        |
| **Error Red**     | `#EF4444` | rgb(239, 68, 68)   | Errors, critical alerts         |
| **Neutral Gray**  | `#6B7280` | rgb(107, 114, 128) | Secondary text, borders         |

### Tier Colors (Vishwas Score)

| Tier           | Primary   | Gradient            | Badge BG  |
| -------------- | --------- | ------------------- | --------- |
| **Unverified** | `#9CA3AF` | `#9CA3AF → #6B7280` | `#F3F4F6` |
| **Bronze**     | `#CD7F32` | `#CD7F32 → #A0522D` | `#FEF3C7` |
| **Silver**     | `#C0C0C0` | `#E5E7EB → #9CA3AF` | `#F3F4F6` |
| **Gold**       | `#FFD700` | `#FCD34D → #F59E0B` | `#FEF9C3` |
| **Platinum**   | `#E5E4E2` | `#F3F4F6 → #D1D5DB` | `#EFF6FF` |
| **Diamond**    | `#B9F2FF` | `#67E8F9 → #06B6D4` | `#ECFEFF` |

### Background Colors

| Context              | Light Mode | Dark Mode |
| -------------------- | ---------- | --------- |
| **App Background**   | `#FFFFFF`  | `#0F172A` |
| **Card Background**  | `#F9FAFB`  | `#1E293B` |
| **Elevated Surface** | `#FFFFFF`  | `#334155` |
| **Input Background** | `#F3F4F6`  | `#1E293B` |

---

## 1.2 TYPOGRAPHY

### Font Family

```css
--font-primary: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
--font-display: "Outfit", sans-serif; /* For headings */
--font-hindi: "Noto Sans Devanagari", sans-serif; /* For Hindi text */
```

### Type Scale

| Name           | Size | Weight | Line Height | Usage                |
| -------------- | ---- | ------ | ----------- | -------------------- |
| **Display XL** | 36px | 700    | 1.1         | Vishwas Score number |
| **Display**    | 28px | 700    | 1.2         | Screen titles        |
| **Heading 1**  | 24px | 600    | 1.3         | Section headers      |
| **Heading 2**  | 20px | 600    | 1.4         | Card titles          |
| **Body Large** | 18px | 400    | 1.5         | Primary content      |
| **Body**       | 16px | 400    | 1.5         | Default text         |
| **Body Small** | 14px | 400    | 1.5         | Secondary text       |
| **Caption**    | 12px | 500    | 1.4         | Labels, timestamps   |
| **Overline**   | 10px | 600    | 1.3         | Badges, tags         |

---

## 1.3 SPACING SYSTEM

```css
--space-1: 4px; /* Micro spacing */
--space-2: 8px; /* Element spacing */
--space-3: 12px; /* Component padding */
--space-4: 16px; /* Card padding */
--space-5: 20px; /* Section spacing */
--space-6: 24px; /* Screen padding */
--space-8: 32px; /* Major sections */
--space-10: 40px; /* Screen margins */
--space-12: 48px; /* Large gaps */
```

---

## 1.4 BORDER RADIUS

```css
--radius-sm: 6px; /* Buttons, inputs */
--radius-md: 12px; /* Cards */
--radius-lg: 16px; /* Modals */
--radius-xl: 24px; /* Hero cards */
--radius-full: 9999px; /* Pills, avatars */
```

---

## 1.5 SHADOWS

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
--shadow-glow-blue: 0 0 20px rgba(37, 99, 235, 0.3);
--shadow-glow-green: 0 0 20px rgba(16, 185, 129, 0.3);
```

---

## 1.6 ANIMATION TOKENS

```css
--transition-fast: 150ms ease-out;
--transition-normal: 250ms ease-out;
--transition-slow: 350ms ease-out;
--transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);

/* Keyframes */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
@keyframes shimmer {
  from {
    background-position: -200%;
  }
  to {
    background-position: 200%;
  }
}
```

---

# PART 2: COMPONENT LIBRARY

## 2.1 BUTTONS

### Primary Button

```
┌─────────────────────────────────────┐
│  🔐 Continue with Credity           │
└─────────────────────────────────────┘
```

| Property      | Value                           |
| ------------- | ------------------------------- |
| Background    | `--credity-blue`                |
| Text Color    | `#FFFFFF`                       |
| Font          | Body, 600 weight                |
| Padding       | 16px 24px                       |
| Border Radius | `--radius-sm`                   |
| **Hover**     | Darken 10%, scale(1.02)         |
| **Active**    | Darken 15%, scale(0.98)         |
| **Disabled**  | Opacity 0.5, cursor not-allowed |
| **Loading**   | Spinner replaces icon           |

### Secondary Button

```
┌─────────────────────────────────────┐
│         Skip for now →              │
└─────────────────────────────────────┘
```

| Property   | Value                      |
| ---------- | -------------------------- |
| Background | Transparent                |
| Border     | 1px solid `--neutral-gray` |
| Text Color | `--neutral-gray`           |
| **Hover**  | Background `#F3F4F6`       |

### Icon Button

```
┌─────┐
│  ⚙️  │
└─────┘
```

| Property   | Value                |
| ---------- | -------------------- |
| Size       | 44px × 44px          |
| Background | Transparent          |
| **Hover**  | Background `#F3F4F6` |
| **Active** | Scale 0.9            |

### Floating Action Button (FAB)

```
    ┌─────┐
    │  ➕  │
    └─────┘
```

| Property      | Value                         |
| ------------- | ----------------------------- |
| Size          | 56px × 56px                   |
| Background    | `--credity-blue`              |
| Shadow        | `--shadow-lg`                 |
| Position      | Bottom-right, 24px from edges |
| **Animation** | Bounce on mount               |

---

## 2.2 CARDS

### Credential Card

```
┌─────────────────────────────────────────┐
│  ┌────┐                                 │
│  │ 🎓 │   B.Tech Computer Science       │
│  └────┘   IIT Delhi                     │
│           Issued: May 15, 2024          │
│                                         │
│  ✅ Verified    ⛓️ Blockchain Anchored   │
└─────────────────────────────────────────┘
```

| Element         | Specification                                                          |
| --------------- | ---------------------------------------------------------------------- |
| Container       | Background: card-bg, Radius: `--radius-md`, Shadow: `--shadow-md`      |
| Icon Container  | 48px × 48px, Radius: `--radius-sm`, Background: tier color 10% opacity |
| Title           | Heading 2, Primary text color                                          |
| Subtitle        | Body Small, Secondary text color                                       |
| Date            | Caption, Tertiary text color                                           |
| Status Pills    | Overline, Pill shape, Color-coded                                      |
| **Tap Action**  | Navigate to Credential Detail                                          |
| **Long Press**  | Show context menu (Share, Delete)                                      |
| **Swipe Left**  | Reveal Share button                                                    |
| **Swipe Right** | Reveal Delete button                                                   |

### Score Card (Vishwas Score Display)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   विश्वास स्कोर™                                │
│                                                 │
│           ┌─────────────┐                       │
│           │             │                       │
│           │    720      │  PLATINUM 💎          │
│           │   ──────    │                       │
│           │   /1000     │                       │
│           └─────────────┘                       │
│                                                 │
│   ████████████████████░░░░░  72%               │
│                                                 │
│   🔓 +80 pts available                          │
│   → Complete Liveness Check                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element        | Specification                                           |
| -------------- | ------------------------------------------------------- |
| Container      | Gradient background (tier-based), Radius: `--radius-xl` |
| Score Number   | Display XL, White, centered                             |
| Tier Badge     | Pill with tier icon, positioned top-right               |
| Progress Bar   | Height: 8px, Radius: full, Animated fill                |
| Suggestion     | Body Small, Semi-transparent white, Icon + text         |
| **Tap Action** | Navigate to Score Breakdown                             |
| **Animation**  | Score counts up from 0 on mount                         |

---

## 2.3 INPUT FIELDS

### Text Input

```
┌─────────────────────────────────────┐
│  📧 Email Address                   │
│  ────────────────────────────────   │
│  raghav@example.com                 │
└─────────────────────────────────────┘
```

| State    | Style                                                      |
| -------- | ---------------------------------------------------------- |
| Default  | Border: 1px `#E5E7EB`, Background: `#F9FAFB`               |
| Focused  | Border: 2px `--credity-blue`, Shadow: `--shadow-glow-blue` |
| Error    | Border: 2px `--error-red`, Helper text in red              |
| Success  | Border: 2px `--trust-green`, Checkmark icon                |
| Disabled | Background: `#F3F4F6`, Opacity: 0.6                        |

### OTP Input

```
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 4 │ │ 2 │ │ 8 │ │ 7 │ │   │ │   │
└───┘ └───┘ └───┘ └───┘ └───┘ └───┘
```

| Property        | Value               |
| --------------- | ------------------- |
| Box Size        | 48px × 56px         |
| Font            | Display, centered   |
| Auto-focus next | On digit entry      |
| **Paste**       | Auto-fill all boxes |

---

## 2.4 NAVIGATION

### Bottom Tab Bar

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  🏠        📤        🏆        ⚙️               │
│  Home     Share    Score    Settings           │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element        | Specification                                            |
| -------------- | -------------------------------------------------------- |
| Container      | Height: 64px, Background: card-bg, Border-top: 1px       |
| Tab Item       | Flex: 1, Center aligned                                  |
| Active Tab     | Icon: `--credity-blue`, Label: bold, Indicator dot above |
| Inactive Tab   | Icon: `--neutral-gray`, Label: regular                   |
| **Transition** | Icon scales 1.1 on tap                                   |
| **Haptic**     | Light feedback on tab change                             |

### Header

```
┌─────────────────────────────────────────────────┐
│  ←    Credential Details              ⋮        │
└─────────────────────────────────────────────────┘
```

| Element     | Specification                       |
| ----------- | ----------------------------------- |
| Height      | 56px                                |
| Back Button | 44px tap target, Icon: ChevronLeft  |
| Title       | Heading 2, centered or left-aligned |
| Actions     | Right side, Icon buttons            |
| **Scroll**  | Collapses to 44px on scroll         |

---

# PART 3: SCREEN-BY-SCREEN SPECIFICATION

## FLOW 1: ONBOARDING (First-Time User)

### Screen 1.1: Welcome/Splash

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│                                                 │
│                   🔐                            │
│                CREDITY                          │
│                                                 │
│         India's Trust Layer                     │
│                                                 │
│                                                 │
│              ● ○ ○ ○                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element      | Specification                              |
| ------------ | ------------------------------------------ |
| Logo         | 80px, Animated entrance (scale up + fade)  |
| App Name     | Display, `--credity-blue`                  |
| Tagline      | Body, `--neutral-gray`                     |
| Page Dots    | 4 dots, swipe to advance                   |
| **Duration** | 2 seconds, then auto-advance OR user swipe |
| **Skip**     | Tap anywhere to skip to login              |

### Screen 1.2: Value Proposition Carousel

**Slide 1: Own Your Identity**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│               [ Illustration ]                  │
│            Person with digital ID               │
│                                                 │
│        OWN YOUR IDENTITY                        │
│                                                 │
│   Import documents from DigiLocker              │
│   in one tap. Your data, your control.          │
│                                                 │
│              ● ○ ○ ○                            │
│                                                 │
│    ┌───────────────────────────────────┐        │
│    │         Get Started               │        │
│    └───────────────────────────────────┘        │
│                                                 │
│               Skip Setup →                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Slide 2: Build Your Vishwas Score**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│               [ Illustration ]                  │
│           Trust meter going up                  │
│                                                 │
│       BUILD YOUR VISHWAS SCORE™                 │
│                                                 │
│   Earn trust points by verifying                │
│   credentials. Higher score = more access.      │
│                                                 │
│              ○ ● ○ ○                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Slide 3: Verify Instantly**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│               [ Illustration ]                  │
│            QR code scanning                     │
│                                                 │
│         VERIFY INSTANTLY                        │
│                                                 │
│   Share verified credentials with               │
│   employers in under 5 seconds.                 │
│                                                 │
│              ○ ○ ● ○                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Slide 4: Privacy First**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│               [ Illustration ]                  │
│               Shield with lock                  │
│                                                 │
│          PRIVACY FIRST                          │
│                                                 │
│   Share only what you choose.                   │
│   Your data never leaves your device.           │
│                                                 │
│              ○ ○ ○ ●                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Carousel Behavior | Specification                             |
| ----------------- | ----------------------------------------- |
| Swipe             | Horizontal, with momentum                 |
| Auto-advance      | Every 4 seconds (pause on touch)          |
| Dots              | Tap to jump to slide                      |
| Get Started       | Visible on all slides, navigates to Login |

---

### Screen 1.3: Login/Signup

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                   🔐                            │
│                                                 │
│        Claim Your Digital Identity              │
│           in 30 Seconds                         │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  🇮🇳 +91  │  Enter phone number           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │           Continue                         │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ─────────────────  OR  ─────────────────────   │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  🔵 Continue with Google                   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  ⚫ Continue with Apple                    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│       By continuing, you agree to our           │
│       Terms of Service & Privacy Policy         │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element         | Action                                                |
| --------------- | ----------------------------------------------------- |
| Phone Input     | Country code picker + number field                    |
| Continue Button | Validate number → Send OTP → Navigate to OTP screen   |
| Google Button   | OAuth flow → Create/Login → Navigate to DigiLocker    |
| Apple Button    | Apple Sign-in → Create/Login → Navigate to DigiLocker |
| Terms Link      | Open Terms in webview                                 |
| Privacy Link    | Open Privacy Policy in webview                        |

### Screen 1.4: OTP Verification

```
┌─────────────────────────────────────────────────┐
│  ←                                              │
│                                                 │
│              Verify Your Number                 │
│                                                 │
│      Enter the 6-digit code sent to             │
│              +91 98765 43210                    │
│                                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐          │
│  │ 4 │ │ 2 │ │ 8 │ │ 7 │ │   │ │   │          │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘          │
│                                                 │
│           Didn't receive code?                  │
│           Resend in 0:28                        │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │           Verify & Continue                │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element        | Behavior                                           |
| -------------- | -------------------------------------------------- |
| OTP Boxes      | Auto-focus next on digit, auto-submit on 6th digit |
| Resend Timer   | Countdown from 30s, enable "Resend" button at 0    |
| Verify Button  | Validate OTP → Loading state → Success → Navigate  |
| Error State    | Shake animation, red border, error message         |
| **Transition** | Slide right to DigiLocker screen                   |

---

### Screen 1.5: DigiLocker Connect

```
┌─────────────────────────────────────────────────┐
│  ←                                              │
│                                                 │
│           🔗 Connect DigiLocker                 │
│                                                 │
│       Import your government documents          │
│              with one tap                       │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │   [ DigiLocker Logo Animation ]           │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│       ✓ Aadhaar Card                            │
│       ✓ PAN Card                                │
│       ✓ Driving License                         │
│       ✓ Education Certificates                  │
│       ✓ Insurance Policies                      │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │      Connect DigiLocker                    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│               Skip for now →                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element          | Action                                                          |
| ---------------- | --------------------------------------------------------------- |
| Connect Button   | Opens DigiLocker OAuth in webview → Consent → Callback → Import |
| Skip Button      | Navigate to Liveness screen (score penalty warning)             |
| Document List    | Animated checkmarks on successful import                        |
| **Post-Connect** | Show "Importing X documents..." loader → Success toast          |

---

### Screen 1.6: Liveness Verification

```
┌─────────────────────────────────────────────────┐
│  ←                                              │
│                                                 │
│          👤 Verify You're Human                 │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │                                           │  │
│  │         [ Camera Preview ]                │  │
│  │         Face oval overlay                 │  │
│  │                                           │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│        Position your face in the oval          │
│                                                 │
│       Challenge 1 of 3: Blink twice            │
│                                                 │
│       ████████░░░░░░░░░░░░  33%                │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Challenge Flow | User Action      | Detection                  |
| -------------- | ---------------- | -------------------------- |
| **Blink**      | Blink eyes twice | Eye aspect ratio change    |
| **Turn Left**  | Rotate head left | Face landmark displacement |
| **Smile**      | Natural smile    | AU6 + AU12 detection       |

| Element        | Specification                               |
| -------------- | ------------------------------------------- |
| Camera Preview | Full-width, 16:9 ratio                      |
| Face Oval      | Center, pulsing animation when detecting    |
| Challenge Text | Large, animated entrance per challenge      |
| Progress Bar   | Fills as challenges complete                |
| **Success**    | Green checkmark animation → Proceed         |
| **Failure**    | Red X, shake, "Try again" prompt            |
| **Timeout**    | After 30s, show "Having trouble?" with tips |

---

### Screen 1.7: Biometrics Setup

```
┌─────────────────────────────────────────────────┐
│  ←                                              │
│                                                 │
│           🔒 Secure Your Wallet                 │
│                                                 │
│       Enable biometric login for                │
│           quick & secure access                 │
│                                                 │
│                                                 │
│               [ Face ID Icon ]                  │
│                 or                              │
│             [ Fingerprint Icon ]                │
│                                                 │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │      Enable Face ID                        │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │      Use PIN Instead                       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element           | Action                                                       |
| ----------------- | ------------------------------------------------------------ |
| Enable Biometrics | Trigger device biometric prompt → Success → Navigate to Home |
| Use PIN           | Navigate to PIN creation screen                              |
| **System Dialog** | Native Face ID / Touch ID / Fingerprint prompt               |

---

### Screen 1.8: Onboarding Complete

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│                                                 │
│                   ✓                             │
│              (Animated checkmark)               │
│                                                 │
│          You're All Set!                        │
│                                                 │
│   Your starting Vishwas Score:                  │
│                                                 │
│               250 🥉                            │
│              BRONZE                             │
│                                                 │
│       +300 points available                     │
│       Complete more verifications!              │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │         Go to My Wallet                    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Animation Sequence                    |
| ------------------------------------- |
| 1. Checkmark draws (0.5s)             |
| 2. "You're All Set!" fades in (0.3s)  |
| 3. Score counts up from 0 to 250 (1s) |
| 4. Bronze badge bounces in (0.3s)     |
| 5. Confetti particles (subtle)        |

---

## FLOW 2: HOME (The Vault)

### Screen 2.1: Home Dashboard

```
┌─────────────────────────────────────────────────┐
│  Hi, Raghav 👋                          🔔 ⚙️   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │        विश्वास स्कोर™                      │  │
│  │                                           │  │
│  │              720 💎                       │  │
│  │            PLATINUM                       │  │
│  │                                           │  │
│  │  ████████████████████░░░░░  72%          │  │
│  │                                           │  │
│  │  +80 pts → Complete Liveness Check       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  MY CREDENTIALS (6)                    View All │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ 🪪 Aadhaar   │  │ 📜 PAN Card  │            │
│  │ ✓ Verified   │  │ ✓ Verified   │            │
│  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ 🎓 B.Tech    │  │ 🏢 TCS       │            │
│  │ IIT Delhi    │  │ Experience   │            │
│  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ ➕ Add       │  │ 🔗 DigiLocker│            │
│  │ Credential   │  │ Sync         │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  RECENT ACTIVITY                               │
│  ─────────────────────────────────────────────  │
│  📤 Shared PAN with HDFC Bank      2 min ago   │
│  ✅ Degree verified by TechCorp    Yesterday   │
│  ─────────────────────────────────────────────  │
│                                                 │
├─────────────────────────────────────────────────┤
│  🏠       📤        🏆       ⚙️                 │
│  Home    Share    Score   Settings             │
└─────────────────────────────────────────────────┘
```

| Element           | Tap Action                    | Long Press   |
| ----------------- | ----------------------------- | ------------ |
| Score Card        | Navigate to Score Breakdown   | -            |
| Credential Card   | Navigate to Credential Detail | Context menu |
| Add Credential    | Show Add Options modal        | -            |
| DigiLocker Sync   | Trigger sync loading          | -            |
| Notification Bell | Navigate to Notifications     | -            |
| Settings Gear     | Navigate to Settings          | -            |
| Activity Item     | Navigate to Activity Detail   | -            |
| View All          | Navigate to All Credentials   | -            |

---

### Screen 2.2: Credential Detail

```
┌─────────────────────────────────────────────────┐
│  ←  Credential Details                    ⋮     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │              🎓                           │  │
│  │                                           │  │
│  │   B.Tech in Computer Science              │  │
│  │   Indian Institute of Technology Delhi    │  │
│  │                                           │  │
│  │   ═══════════════════════════════════     │  │
│  │                                           │  │
│  │   Student: Raghav Badhwar                 │  │
│  │   Roll No: 2020CS10234                    │  │
│  │   Duration: Aug 2020 - May 2024           │  │
│  │   CGPA: 8.7 / 10                          │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  VERIFICATION STATUS                           │
│  ─────────────────────────────────────────────  │
│  ✅ Source Verified          DigiLocker        │
│  ✅ Issuer Authentic         IIT Delhi         │
│  ✅ Not Expired              Valid Forever     │
│  ⛓️ Blockchain Anchored      Polygon           │
│     View on PolygonScan →                      │
│                                                 │
│  SHARE HISTORY                                 │
│  ─────────────────────────────────────────────  │
│  📤 Shared with TechCorp         Dec 20, 2025  │
│  📤 Shared with Google India     Dec 15, 2025  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  📤 Share This Credential                 │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element            | Action                                      |
| ------------------ | ------------------------------------------- |
| Back Arrow         | Navigate back with slide animation          |
| More Menu (⋮)      | Options: Download PDF, Delete, Report Issue |
| PolygonScan Link   | Open blockchain explorer in browser         |
| Share History Item | Show share detail modal                     |
| Share Button       | Navigate to Share Consent flow              |

---

## FLOW 3: SHARE CREDENTIALS

### Screen 3.1: Generate Share Link/QR

```
┌─────────────────────────────────────────────────┐
│  ←  Share Credentials                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  SELECT CREDENTIALS TO SHARE                   │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ Aadhaar Card                            │  │
│  │   Name, DOB, Photo                        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ PAN Card                                │  │
│  │   PAN Number, Name                        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ ○ B.Tech Degree                           │  │
│  │   Institution, CGPA, Year                 │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  LINK SETTINGS                                 │
│  ─────────────────────────────────────────────  │
│  Expires after:    [ 24 hours ▼ ]              │
│  View limit:       [ 3 views ▼ ]               │
│  Require Face ID:  [ ● ON ]                    │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │      Generate Secure Link                  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element               | Behavior                                   |
| --------------------- | ------------------------------------------ |
| Credential Checkboxes | Multi-select, show selected count          |
| Expires Dropdown      | Options: 1 hour, 24 hours, 7 days, 30 days |
| View Limit            | Options: 1, 3, 5, 10, Unlimited            |
| Face ID Toggle        | Requires verifier to complete liveness     |
| Generate Button       | Create encrypted link → Show QR modal      |

### Screen 3.2: Share Methods Modal

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              Share Your Credentials             │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │         [ QR CODE ]                       │  │
│  │                                           │  │
│  │     credity.in/v/xK9m2...                │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────┐  ┌───────────────────┐  │
│  │ 📋 Copy Link       │  │ 💬 WhatsApp       │  │
│  └───────────────────┘  └───────────────────┘  │
│  ┌───────────────────┐  ┌───────────────────┐  │
│  │ 📧 Email          │  │ 📤 More...        │  │
│  └───────────────────┘  └───────────────────┘  │
│                                                 │
│           Expires in 23h 45m                    │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │              Done                          │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Share Method | Action                                  |
| ------------ | --------------------------------------- |
| Copy Link    | Copy to clipboard, show "Copied!" toast |
| WhatsApp     | Open WhatsApp with pre-filled message   |
| Email        | Open email composer with link           |
| More         | Native share sheet                      |

---

### Screen 3.3: Incoming Share Request (Push Notification)

```
┌─────────────────────────────────────────────────┐
│  CREDITY                              Just now  │
│  🏢 HDFC Bank wants to verify your credentials │
│  Tap to review and approve                      │
└─────────────────────────────────────────────────┘
```

### Screen 3.4: Share Consent Screen

```
┌─────────────────────────────────────────────────┐
│  ←                                              │
├─────────────────────────────────────────────────┤
│                                                 │
│           📤 Verification Request               │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │            🏢                             │  │
│  │         HDFC Bank                         │  │
│  │                                           │  │
│  │   Verified Verifier ✓                     │  │
│  │   Purpose: Loan Application               │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  REQUESTING ACCESS TO:                         │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ Full Name                               │  │
│  │ ✓ Date of Birth                           │  │
│  │ ✓ PAN Number (masked: XXXXX1234X)         │  │
│  │ ○ Full Address (optional)                 │  │
│  │ ○ Aadhaar Number (optional)               │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ⚠️ Only selected data will be shared          │
│  Data expires after 1 verification             │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  🔓 Approve with Face ID                   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  ❌ Deny Request                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Report suspicious request                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Element         | Action                                               |
| --------------- | ---------------------------------------------------- |
| Required Fields | Pre-checked, not toggleable                          |
| Optional Fields | User can toggle                                      |
| Approve Button  | Trigger Face ID → Success → Send data → Confirmation |
| Deny Button     | Show "Request Denied" → Navigate back                |
| Report Link     | Open report form                                     |

---

## FLOW 4: VISHWAS SCORE

### Screen 4.1: Score Overview

```
┌─────────────────────────────────────────────────┐
│  ←  Vishwas Score™                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │              720 💎                       │  │
│  │            PLATINUM                       │  │
│  │                                           │  │
│  │   ████████████████████░░░░░  72%         │  │
│  │                                           │  │
│  │   +130 pts to Diamond                     │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  SCORE BREAKDOWN                               │
│                                                 │
│  Identity (40%)                    280/400     │
│  ████████████████████░░░░░░░░░░                │
│  ✓ Liveness  ✓ DigiLocker  ✓ Biometrics       │
│                                                 │
│  Credentials (30%)                 210/300     │
│  ████████████████████░░░░░░░░░░                │
│  7 verified credentials                        │
│                                                 │
│  Activity (20%)                    150/200     │
│  ████████████████████████░░░░░░                │
│  12 verifications fulfilled                    │
│                                                 │
│  Reputation (10%)                  80/100      │
│  ████████████████████████████░░                │
│  3 endorsements, 0 flags                       │
│                                                 │
├─────────────────────────────────────────────────┤
│  HOW TO IMPROVE                      See All → │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ⚡ Quick Win: Add LinkedIn              │   │
│  │    +40 points                           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Screen 4.2: Score History

```
┌─────────────────────────────────────────────────┐
│  ←  Score History                               │
├─────────────────────────────────────────────────┤
│                                                 │
│      [ Line Chart: Last 30 Days ]              │
│                                                 │
│  800 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─            │
│       │     ╭─╮                                │
│  600 ─•─────╯ ╰───────●                        │
│       │                                        │
│  400 ─│────────────────────────────            │
│       │                                        │
│  200 ─│                                        │
│       └────────────────────────────            │
│       Dec 1        Dec 15       Dec 26         │
│                                                 │
│  MILESTONES                                    │
│  ─────────────────────────────────────────────  │
│  💎 Reached Platinum!           Dec 20         │
│  🎓 Added B.Tech Degree         Dec 15         │
│  👤 Completed Liveness          Dec 10         │
│  🔗 Connected DigiLocker        Dec 1          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Screen 4.3: Badges

```
┌─────────────────────────────────────────────────┐
│  ←  My Badges                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  EARNED (4)                                    │
│                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │   👤   │  │   🔗   │  │   ⚡   │            │
│  │Verified│  │DigiLock│  │ Quick  │            │
│  │ Human  │  │  Pro   │  │Respond │            │
│  └────────┘  └────────┘  └────────┘            │
│  ┌────────┐                                    │
│  │   🚀   │                                    │
│  │ Early  │                                    │
│  │Adopter │                                    │
│  └────────┘                                    │
│                                                 │
│  LOCKED (3)                                    │
│                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │   🌟   │  │   💎   │  │   🏆   │            │
│  │Endorse │  │ Trust  │  │Diamond │            │
│  │ Magnet │  │ Elite  │  │ Member │            │
│  │ 4 more │  │ 180pts │  │ 130pts │            │
│  └────────┘  └────────┘  └────────┘            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## FLOW 5: SETTINGS

### Screen 5.1: Settings Menu

```
┌─────────────────────────────────────────────────┐
│  ←  Settings                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 👤 Raghav Badhwar                         │  │
│  │    raghav@example.com                     │  │
│  │    +91 98765 43210                        │  │
│  │                                     Edit → │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  SECURITY                                      │
│  ─────────────────────────────────────────────  │
│  🔒 Biometric Login                  Enabled   │
│  📱 Trusted Devices                    2 →     │
│  🔑 Change PIN                              →  │
│  🔐 Two-Factor Auth                Enabled →   │
│                                                 │
│  PRIVACY                                       │
│  ─────────────────────────────────────────────  │
│  📊 Data Sharing                            →  │
│  🗑️ Delete My Data                          →  │
│  📄 Export My Data                          →  │
│                                                 │
│  PREFERENCES                                   │
│  ─────────────────────────────────────────────  │
│  🌙 Dark Mode                        [ ● ]     │
│  🌐 Language                       English →   │
│  🔔 Notifications                           →  │
│                                                 │
│  ABOUT                                         │
│  ─────────────────────────────────────────────  │
│  📜 Terms of Service                        →  │
│  🔏 Privacy Policy                          →  │
│  ℹ️ About Credity                 v1.0.0    →  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │         Sign Out                          │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

# PART 4: ENTERPRISE UI FRAMEWORK

## Credity Verify (Recruiter Dashboard)

### Color Modifications

| Context    | Color                                |
| ---------- | ------------------------------------ |
| Primary    | `#1E40AF` (Darker Blue - Enterprise) |
| Accent     | `#7C3AED` (Purple - Verification)    |
| Background | `#F8FAFC` (Softer white)             |

### Screen: Verification Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 CREDITY VERIFY     TechCorp, Inc.    ₹15,000/mo    🔔   👤 Admin        │
├─────────────────────────────────────────────────────────────────────────────┤
│  │                                                                         │
│  │🏠 Dashboard      ┌───────────────────────────────────────────────────┐  │
│  │                  │ 📊 THIS MONTH                                     │  │
│  │🔍 Instant Verify │ ┌────────────┐ ┌────────────┐ ┌────────────┐      │  │
│  │                  │ │   847     │  │   98.2%   │  │    12     │      │  │
│  │📁 Bulk Upload    │ │ Verified   │  │ Pass Rate  │  │ Fraud    │      │  │
│  │                  │ │ Candidates │  │           │  │ Caught    │      │  │
│  │⚠️ Flagged (12)   │ └────────────┘ └────────────┘ └────────────┘      │  │
│  │                  │                                                   │  │
│  │📊 Analytics      │ 🔍 INSTANT VERIFY                                 │  │
│  │                  │ ┌─────────────────────────────────────────────┐  │  │
│  │🔑 API Keys       │ │ Paste credential link or upload document... │  │  │
│  │                  │ │                                    [VERIFY] │  │  │
│  │💳 Billing        │ └─────────────────────────────────────────────┘  │  │
│  │                  │                                                   │  │
│  │                  │ 📋 RECENT VERIFICATIONS                          │  │
│  │                  │ ┌─────────────────────────────────────────────┐  │  │
│  │                  │ │ Name         │ Type     │ Score │ Status   │  │  │
│  │                  │ ├──────────────┼──────────┼───────┼──────────┤  │  │
│  │                  │ │ Priya Sharma │ B.Tech   │  94   │ ✅ Pass  │  │  │
│  │                  │ │ Rahul Kumar  │ PAN+ID   │  88   │ ✅ Pass  │  │  │
│  │                  │ │ Amit Singh   │ Work Exp │  42   │ ⚠️ Review│  │  │
│  │                  │ └─────────────────────────────────────────────┘  │  │
│  │                  └───────────────────────────────────────────────────┘  │
│  │                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Credity Issuer (Institution Portal)

### Screen: Bulk Issuance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 CREDITY ISSUER     IIT Delhi               🔔   👤 Registrar            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📤 BULK CREDENTIAL ISSUANCE                                               │
│                                                                             │
│  Step 1: Upload Data                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │               [ Drag & Drop CSV/Excel ]                            │   │
│  │                                                                     │   │
│  │              or click to browse files                               │   │
│  │                                                                     │   │
│  │              📥 Download Template                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 2: Map Fields                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CSV Column          →    Credential Field                          │   │
│  │ "Student_Name"      →    [ Full Name ▼ ]                           │   │
│  │ "Roll_Number"       →    [ Student ID ▼ ]                          │   │
│  │ "Degree"            →    [ Credential Type ▼ ]                     │   │
│  │ "CGPA"              →    [ Grade ▼ ]                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 3: Review                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Ready to issue: 2,847 credentials                                   │   │
│  │ Errors found: 12 (missing data)                                     │   │
│  │ ⚠️ Review Errors                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────┐   │
│  │        Cancel                    │  │     Issue 2,847 Credentials  │   │
│  └──────────────────────────────────┘  └──────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 5: MICRO-INTERACTIONS & ANIMATIONS

## Animation Library

| Animation      | Usage              | Duration | Easing      |
| -------------- | ------------------ | -------- | ----------- |
| **fadeIn**     | Screen transitions | 250ms    | ease-out    |
| **slideUp**    | Modal appearance   | 300ms    | ease-out    |
| **slideRight** | Screen push        | 300ms    | ease-in-out |
| **bounce**     | Success states     | 500ms    | spring      |
| **shake**      | Error states       | 300ms    | ease-in-out |
| **pulse**      | Attention grabbers | 1000ms   | ease-in-out |
| **countUp**    | Score display      | 1000ms   | ease-out    |
| **confetti**   | Celebration        | 2000ms   | linear      |
| **shimmer**    | Loading skeleton   | 1500ms   | linear      |

## Loading States

### Skeleton Loading

```
┌─────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░ ← Shimmer animation            │
│  ░░░░░░░░░░░░                                   │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░                    │
└─────────────────────────────────────────────────┘
```

### Progress Indicators

```
Spinner (circular): Continuous rotation
Progress Bar: Fill from left with percentage
Dots: Three bouncing dots
```

## Haptic Feedback

| Action          | Haptic Type          |
| --------------- | -------------------- |
| Button Tap      | Light impact         |
| Tab Change      | Selection            |
| Error           | Error notification   |
| Success         | Success notification |
| Long Press      | Medium impact        |
| Pull to Refresh | Light + Selection    |

---

# PART 6: ACCESSIBILITY GUIDELINES

## Touch Targets

- Minimum size: 44px × 44px
- Spacing between targets: 8px minimum

## Color Contrast

- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

## Screen Reader Support

- All images have alt text
- Buttons have accessible labels
- Form inputs have labels and hints
- Dynamic content announces changes

## Motion Preferences

- Respect `prefers-reduced-motion`
- Provide static alternatives for animations
- No auto-playing videos without user consent

---

_This document serves as the complete UI/UX specification for Credity. Implementation should follow these guidelines precisely._

**Version:** 1.0  
**Last Updated:** December 26, 2025
