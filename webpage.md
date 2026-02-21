# CREDITY — THE ULTIMATE FRAMER WEBSITE

> **Goal:** Create an Awwwards-worthy website that showcases every powerful animation and interaction Framer offers. This should be India's most impressive fintech website.

---

# FONTS TO USE

| Font                | Weight        | Use Case               | Source           |
| ------------------- | ------------- | ---------------------- | ---------------- |
| **Cabinet Grotesk** | 700, 800      | Headlines, Hero Text   | Fontshare (Free) |
| **Satoshi**         | 400, 500, 700 | Body, UI, Buttons      | Fontshare (Free) |
| **Clash Display**   | 600           | Numbers, Stats, Badges | Fontshare (Free) |
| **JetBrains Mono**  | 400           | Code blocks            | Google Fonts     |

---

# COLORS (NO GRADIENTS — SOLID ONLY)

| Name         | Hex       | Use               |
| ------------ | --------- | ----------------- |
| **Void**     | `#0A0A0A` | Primary dark bg   |
| **Snow**     | `#FAFAFA` | Light sections    |
| **Electric** | `#0066FF` | Primary actions   |
| **Emerald**  | `#00C896` | Success, verified |
| **Coral**    | `#FF4D4D` | Alerts, fraud     |
| **Cream**    | `#F5F3EF` | Card backgrounds  |
| **Slate**    | `#64748B` | Secondary text    |
| **Amber**    | `#FFB800` | Trust scores      |

---

# FRAMER FEATURES TO USE

## 1. SCROLL TRANSFORMS

- Elements transform (scale, rotate, opacity, position) based on scroll position
- Use for: Hero elements fading, cards scaling in, text revealing

## 2. STICKY SECTIONS

- Content stays fixed while other elements scroll past
- Use for: Feature showcases, product comparisons, storytelling

## 3. SCROLL VARIANTS

- Different states triggered by scroll position
- Use for: Changing content in sticky sections, step-by-step reveals

## 4. PARALLAX EFFECTS

- Layers move at different speeds
- Use for: Hero backgrounds, floating elements, depth

## 5. MORPH TEXT

- Words smoothly transition into other words
- Use for: Hero headline cycling through words

## 6. MAGNETIC BUTTONS

- Buttons attract toward cursor
- Use for: All primary CTAs

## 7. CURSOR EFFECTS

- Custom cursor with trails or effects
- Use for: Global site interaction

## 8. BLUR EFFECTS

- Progressive blur on scroll
- Use for: Text revealing, transitions between sections

## 9. STAGGERED REVEALS

- Children animate in sequence
- Use for: Cards, lists, grids

## 10. HOVER STATE ANIMATIONS

- Rich interactions on hover
- Use for: Cards lift + glow, buttons pulse, images zoom

## 11. NUMBER COUNTERS

- Animated number counting
- Use for: Statistics section

## 12. INFINITE MARQUEE

- Smooth continuous scrolling
- Use for: Logo strips, testimonials

## 13. HORIZONTAL SCROLL SECTIONS

- Scroll horizontally within vertical page
- Use for: Feature showcase, timeline

## 14. 3D CARD TILTS

- Cards rotate toward cursor position
- Use for: Product cards, feature cards

## 15. REVEAL ANIMATIONS

- Content reveals as you scroll (clip, fade, slide)
- Use for: Every section entry

---

# HOMEPAGE — SECTION BY SECTION

---

## SECTION 1: HERO (100vh)

### Background

- **Color:** Void (#0A0A0A)
- **Floating Elements:** Abstract shapes (circles, rings, dots) in Electric blue at 10-20% opacity
- **Parallax:** Shapes move at 0.3x, 0.5x, 0.7x scroll speed

### Headline (MORPH TEXT)

```
India's [Trust/Verification/Identity/Reputation] Layer
```

- The word in brackets morphs between options every 3 seconds
- Font: Cabinet Grotesk 800, 80px desktop / 48px mobile
- Color: Snow
- Animation: Letters blur-in on page load, staggered 0.02s per character

### Subheadline

```
Verify identities. Detect fraud. Build reputation.
Trusted by 500+ enterprises and millions of users.
```

- Font: Satoshi 400, 20px
- Color: Slate
- Animation: Fade up 0.4s after headline completes

### CTAs (MAGNETIC BUTTONS)

```
[Start Free] — Electric bg, Snow text
[Watch Demo ▶] — Transparent, Snow border, Snow text
```

- Both buttons pull toward cursor on hover
- On hover: Scale 1.05, shadow appears
- On click: Ripple effect from click point

### Right Side Visual

- **3D Credential Stack:** 3 cards at different angles
- Cards show: Aadhaar, Degree Certificate, Trust Score Badge
- Animation: Cards float (Y oscillation ±8px, different timing)
- **3D Tilt:** Cards tilt toward cursor position
- On scroll: Cards spread apart and rotate further

### Scroll Indicator

- Small animated arrow at bottom center
- Bounces up/down infinitely
- Fades out after user starts scrolling

---

## SECTION 2: TRUST STRIP (INFINITE MARQUEE)

### Design

- **Background:** Snow (#FAFAFA)
- **Height:** 100px
- **Content:** Logo marquee

### Implementation

```
"Trusted by India's leading organizations"
[Logo] [Logo] [Logo] [Logo] [Logo] [Logo] [Logo]
```

- Logos: DigiLocker, Major Banks, Top Universities, Enterprises
- Animation: Infinite horizontal scroll, 40s complete cycle
- Logos in Void color (grayscale effect)
- On hover pause: Marquee pauses, logo scales 1.1 and becomes full color

---

## SECTION 3: WHAT WE DO (STICKY SCROLL SECTION)

### Concept

This section uses **Sticky + Scroll Variants** — The left side stays sticky showing the current feature visual while the right side scrolls through 3 features.

### Layout

```
┌────────────────────┬─────────────────────┐
│                    │                     │
│   STICKY VISUAL    │   SCROLLING TEXT    │
│   (Changes based   │   Feature 1         │
│   on scroll)       │   Feature 2         │
│                    │   Feature 3         │
│                    │                     │
└────────────────────┴─────────────────────┘
```

### How It Works

- Container height: 300vh (3 viewport heights for 3 sections)
- Left panel: position sticky, top 50%, transform Y -50%
- Right panel: 3 content blocks, each 100vh
- As each block enters viewport, the sticky visual transforms to match

### Feature 1: Identity Verification

**When Scroll Position: 0-33%**

- Visual: Animated face scan with checkmark appearing
- Title: "Know exactly who you're dealing with"
- Description: "Verify any Indian in under 5 seconds using DigiLocker, Aadhaar, PAN, or document verification. AI-powered liveness detection catches spoofs and deepfakes."
- Accent: Emerald green elements

### Feature 2: Fraud Detection

**When Scroll Position: 33-66%**

- Visual: Shield icon with scanning radar animation
- Title: "Catch fraud before it costs you crores"
- Description: "Our AI analyzes documents, videos, and data patterns to detect forgeries, deepfakes, and inconsistencies that humans miss."
- Accent: Coral red elements
- Visual shakes slightly (danger effect)

### Feature 3: Trust Scores

**When Scroll Position: 66-100%**

- Visual: Large circular gauge filling up, number counting to 847
- Title: "Portable reputation across India"
- Description: "Help users build their Vishwas Score™ — a trust rating they can carry from job to job, platform to platform."
- Accent: Amber gold elements

### Transitions Between

- Visual morphs smoothly between states
- Color accents cross-fade
- Icons have enter/exit animations

---

## SECTION 4: STATISTICS (SCROLL REVEAL + COUNTERS)

### Background

- **Color:** Void (#0A0A0A)
- **Texture:** Subtle dot grid pattern at 5% opacity

### Layout

```
      513M+              <5 sec              ₹2L Cr
DigiLocker Users    Verification Time    Fraud Prevented
```

### Typography

- Numbers: Clash Display 600, 120px, Snow color
- Labels: Satoshi 400, 18px, Slate color

### Animations

1. **Scroll Reveal:** Entire section fades up (Y: 60 → 0, opacity 0 → 1) when entering viewport
2. **Number Counter:** Each number counts up from 0 when section is 50% in view
   - 513M counts up over 2.5 seconds
   - 5 counts up over 1 second
   - 2 counts up over 1.5 seconds
3. **Stagger:** Numbers animate with 0.2s delay between each
4. **Glow:** After counting complete, numbers have subtle pulsing glow (box-shadow animation)

### Extra Visual Interest

- Thin animated lines connecting the numbers (draw themselves)
- Small floating particles in background (very subtle)

---

## SECTION 5: PRODUCTS (HORIZONTAL SCROLL)

### Concept

A **horizontal scroll section** embedded in vertical page. User scrolls down but content moves horizontally.

### Container

- **Height:** 100vh (viewport height)
- **Internal Width:** 300vw (3 screens worth)
- Content scrolls horizontally as user scrolls vertically

### Product Cards (3 cards side by side)

#### Card 1: Credity Wallet

- **For:** Individuals
- **Tagline:** "Your credentials. Your pocket."
- **Visual:** iPhone mockup with app screenshot
- **Color Accent:** Emerald
- **CTA:** "Download App →"

#### Card 2: Credity Verify

- **For:** Enterprises
- **Tagline:** "Stop fraud before it starts."
- **Visual:** Dashboard mockup
- **Color Accent:** Electric
- **CTA:** "Book Demo →"

#### Card 3: Credity Issuer

- **For:** Institutions
- **Tagline:** "Credentials that can't be faked."
- **Visual:** Certificate/badge floating
- **Color Accent:** Amber
- **CTA:** "Start Issuing →"

### Card Styling

- Background: Cream
- Size: 80vw width, 70vh height
- Border-radius: 24px
- Shadow: Large soft shadow

### Card Animations

- **3D Tilt:** Cards tilt toward cursor (perspective transform)
- **Hover:** Shadow increases, card lifts 12px
- **Progress Indicator:** Dots at bottom show current card

---

## SECTION 6: HOW IT WORKS (ANIMATED TIMELINE)

### Background

- **Color:** Snow (#FAFAFA)

### Section Title

```
Four steps to verified trust
```

- Font: Cabinet Grotesk 700, 56px
- Animation: Blur reveals word by word on scroll

### Timeline Layout (Vertical on mobile, Horizontal on desktop)

```
[1] -----> [2] -----> [3] -----> [4]
Connect   Submit    Analyze   Decide
```

### Steps

| Step | Icon           | Title   | Description                            |
| ---- | -------------- | ------- | -------------------------------------- |
| 01   | Plug icon      | Connect | Integrate our API or use the dashboard |
| 02   | Document icon  | Submit  | Send documents or identity details     |
| 03   | Brain icon     | Analyze | AI checks 50+ data sources             |
| 04   | Checkmark icon | Decide  | Get instant pass/fail with confidence  |

### Animations

1. **Connecting Line:** Dashed line draws itself as user scrolls (stroke-dashoffset animation)
2. **Step Reveal:** Each step fades in when the line reaches it
3. **Icon Animation:** Each icon does a unique micro-animation when revealed
   - Plug: Connects together
   - Document: Flips into place
   - Brain: Pulses
   - Checkmark: Draws itself
4. **Number Highlight:** Numbers have Electric blue background that scales in

---

## SECTION 7: TESTIMONIALS (STAGGERED CARDS)

### Background

- **Color:** Void (#0A0A0A)

### Layout

- Scattered card layout (not a perfect grid)
- 3-4 quote cards positioned at different levels
- Creates organic, editorial feel

### Card Content

```
"Quote from customer about how Credity helped them"

— Name
Role, Company
[Company Logo]
```

### Card Styling

- Background: Cream (light cards on dark bg)
- Padding: 40px
- Border-radius: 16px
- Max-width: 400px

### Animations

1. **Scroll Reveal:** Cards fade in with stagger (0.15s between each)
2. **Float:** Each card has slight Y oscillation (±4px) at different speeds
3. **Hover:** Card lifts up, shadow increases, slight rotation toward cursor
4. **Large Quote Mark:** Decorative " at 200px, Void color, 10% opacity behind each quote

---

## SECTION 8: CTA (FINAL CONVERSION)

### Background

- **Color:** Electric (#0066FF)

### Content

```
Ready to build trust into your product?

Start with 100 free verifications.
No credit card. No commitments.

[Start Free Trial] — Snow bg, Electric text, MAGNETIC
```

### Animations

1. **Text Reveal:** Headline types out letter-by-letter (typewriter effect)
2. **Button:** Magnetic pull effect + ripple on click
3. **Background:** Subtle animated noise/grain texture (very subtle movement)

---

## SECTION 9: FOOTER

### Background

- **Color:** Void (#0A0A0A)

### Layout (4 columns)

```
[Logo + Tagline]  [Products]  [Resources]  [Company]
```

### Content

**Column 1:**

- Credity logo
- "Building India's trust infrastructure"

**Column 2 - Products:**

- Wallet
- Verify
- Issuer
- Gateway API

**Column 3 - Resources:**

- Documentation
- Pricing
- Blog
- Status

**Column 4 - Company:**

- About
- Careers
- Contact
- Press

### Bottom Bar

```
© 2024 Credity  |  Privacy  |  Terms  |  Made in India 🇮🇳

[LinkedIn] [Twitter] [GitHub]
```

### Animations

- Social icons scale up on hover
- Links have underline animation on hover (line draws from left to right)
- "Made in India" badge has subtle pulse

---

# WALLET PAGE

## Hero

- **Background:** Emerald (#00C896)
- **Headline:** "Your credentials. Your control."
- **Visual:** Large iPhone mockup with floating notification badges popping in one by one
- **Parallax:** Phone moves at 0.8x scroll speed, badges at different speeds

## Vishwas Score Section (STICKY WITH SCROLL TRANSFORM)

- Sticky circular gauge in center
- As user scrolls, score fills from 0 to 847
- Tier badges unlock sequentially
- Score number counts up linked to scroll position

## Features (HORIZONTAL SCROLL CARDS)

- 5 feature cards in horizontal scroll
- Each card: Icon + Title + Description
- Cards have 3D tilt on hover

---

# VERIFY PAGE (ENTERPRISE)

## Hero

- **Background:** Void with animated dot grid
- **Headline:** "Stop fraud before it costs you crores"
- **Visual:** Dashboard mockup with animated elements (bars growing, checkmarks appearing)

## Problem Section

- **Stat Cards:** Each showing fraud statistics
- Cards have "danger" red accent
- Subtle shake animation on hover

## Features Grid (STAGGERED REVEAL)

- 2x3 grid of feature blocks
- Each block reveals with stagger 0.1s
- Icons animate when revealed (spin, bounce, pulse)

## Pricing (3D CARD TILT)

- 3 tier cards with 3D perspective tilt
- Middle card (Growth) elevated and highlighted
- "Popular" badge shimmers

---

# ISSUER PAGE (INSTITUTIONS)

## Hero

- **Background:** Snow with Amber accent shapes
- **Headline:** "Issue credentials that can't be faked"
- **Visual:** Stack of credentials fanning out, floating animation

## Issuance Flow (ANIMATED PATH)

- 4 steps connected by flowing dashed line
- Data packets travel along the line (animated dots)
- Each step activates when packet arrives

## Blockchain Section

- **Background:** Void
- Chain links connecting one by one
- Hash values typing out in monospace
- "Verified on Polygon" badge glows

---

# DEVELOPERS PAGE

## Hero

- **Background:** Void with code grid pattern
- **Headline:** "Build trust into everything"
- **Visual:** Animated code editor (code types out with syntax highlighting)
- Cursor blinks while typing

## SDK Cards (FLIP ANIMATION)

- 5 language cards: JS, Python, Ruby, Go, React Native
- On hover: Card flips to show install command
- Language logo animates (small bounce)

## API Features Grid

- 6 feature blocks with animated icons
- Icons: Lock, Bell, Flask, Gauge, Server, Lightning
- Each does micro-animation on scroll reveal

---

# GLOBAL INTERACTIONS

## Custom Cursor

- Default: Small circle with blend-mode effect
- On clickable elements: Cursor expands with "Click" or action hint
- On images: Cursor becomes "View" with eye icon

## Page Transitions

- When navigating between pages:
  - Current page clips away (diagonal wipe)
  - New page fades up from bottom
  - Duration: 0.6s

## Loading State

- Custom loading animation (not default spinner)
- Credity logo mark animates (subtle pulse)

## Scroll Progress Bar

- Thin line at top of viewport
- Color: Electric blue
- Width tracks scroll progress (0% to 100%)

---

# MICRO-INTERACTIONS CHECKLIST

- [ ] All buttons have hover scale (1.02-1.05)
- [ ] All buttons have press state (scale 0.98)
- [ ] All links have underline animations
- [ ] All cards have lift + shadow on hover
- [ ] All icons have subtle animation on hover
- [ ] Form inputs glow on focus
- [ ] Toggles have smooth spring animation
- [ ] Dropdowns have staggered reveal
- [ ] Accordions have spring expand/collapse
- [ ] Images have zoom on hover (scale 1.05)

---

# ANIMATION TIMING GUIDE

| Animation Type  | Duration | Easing                        |
| --------------- | -------- | ----------------------------- |
| Fade in         | 0.4-0.6s | ease-out                      |
| Slide up        | 0.5-0.7s | cubic-bezier(0.16, 1, 0.3, 1) |
| Scale           | 0.2-0.3s | ease-out                      |
| Hover state     | 0.2s     | ease                          |
| Spring bounce   | 0.6s     | spring(300, 20)               |
| Number counter  | 2-3s     | linear                        |
| Morph text      | 0.8s     | ease-in-out                   |
| Page transition | 0.6s     | cubic-bezier(0.4, 0, 0.2, 1)  |

---

# WHAT MAKES THIS AWWWARDS-WORTHY

1. **Sticky Scroll Storytelling** — Like Apple, features reveal through scroll position
2. **Morph Text Hero** — Words transform, creating dynamic first impression
3. **Horizontal Scroll Section** — Breaking the vertical scroll pattern
4. **3D Card Tilts** — Every card responds to cursor position
5. **Magnetic Buttons** — Premium interaction on all CTAs
6. **Custom Cursor** — Site-specific cursor behavior
7. **Animated Statistics** — Numbers that count up, not static text
8. **Choreographed Reveals** — Everything reveals purposefully on scroll
9. **Micro-interactions Everywhere** — Nothing feels dead
10. **Consistent Animation Language** — Same timing and easing throughout

---

# INSPIRATION SITES TO STUDY

| Site             | What to Learn                           |
| ---------------- | --------------------------------------- |
| flighty.com      | Meaningful product animations           |
| oneaamsterdam.nl | Hover states and scroll choreography    |
| linear.app       | Dark mode aesthetics, subtle animations |
| stripe.com       | Product showcases, developer pages      |
| vercel.com       | Bold typography, geometric patterns     |
| superhuman.com   | Bento grids, scroll effects             |

---

_This prompt should result in a website that could win Framer Site of the Month and get an Awwwards mention. Every section has purpose, every animation tells a story, and every interaction feels premium._
