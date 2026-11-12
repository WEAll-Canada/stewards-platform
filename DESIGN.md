# Design guide: WeAll Canada Stewards Platform

Nov 11, 2026 · **Temporary** system for the prototype  
Visual source of truth: [weall.org](https://weall.org/) — friendly, clear, colourful, minimal  
**Product name:** WeAll Canada (not “Wellbeing Economy Alliance” global naming in UI chrome)  
**Mark:** WEAll global **circle logo** — [logo-weall-cor.png](https://weall.org/wp-content/themes/weall-tema/img/logo-weall-cor.png)

Replace look-and-feel via tokens + components when new mockups arrive — no one-off hard-coded colors in feature pages.

Related: [STEWARD_PRD.md](STEWARD_PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DEV_PLAN.md](DEV_PLAN.md).

## Intent

- Friendly, clear, colourful, minimal — high contrast, bold type, geometric colour blocks; not corporate-soft or purple-SaaS.
- **WeAll Canada** in titles/footer/PWA name; **global circle** as the only header mark.
- The circle is not just a favicon — it is a **living system mark**: identity, navigation home, sociocracy circle signal, and light motion.
- Desktop-first product UI; installable as a **PWA**.
- **One tokens file** drives colour, type, space, radii. Pages only use tokens.

Pattern name: **design tokens** (CSS custom properties), e.g. `src/styles/tokens.css`, imported once from the base layout.

## Decisions locked

| Topic | Decision |
| --- | --- |
| Header | **Light** (white / subtle grey), dark ink links |
| Nav brand | **Circle alone** (aria-label “WeAll Canada Stewards”) |
| Product name in UI | WeAll Canada / WeAll Canada Stewards in titles, footer, PWA — not in the header lockup |
| Type loudness | **Split:** Rubik Mono One for public hero + rare celebration moments; **Lato bold** for everyday in-app page titles (revisit if it feels too quiet/loud) |
| Bento accents | Max **one** brand colour accent per panel |
| Circle variants | Yes — see **Circle system** below |

## What we observed on weall.org

| Element | Live site |
| --- | --- |
| Display headings | **Rubik Mono One** — bold, blocky, often large |
| Body / UI | **Lato** |
| Buttons (some) | **Nunito** bold on pill CTAs |
| Brand cyan / yellow / orange / green | `#00A9E0` / `#FDDA24` / `#FF8200` / `#10B726` |
| Extra accents | Deep blue `#0C4DA2`, lime `#84BD00`, hot `#FA4616` |
| Soft surface | `#F0F0F0` |
| Primary CTAs | Black pills, white label |
| Accent CTAs | Yellow pills, black label |
| Logo | Multicolour circle (+ wordmark on marketing site; we use circle alone in nav) |

## Brand lockup

- Official multicolour circle = **alliance / home / “all of us”** state.
- Do not randomly recolour the official asset in the header — use the **SVG circle system** (below) for variants.
- Footer / about / PWA: “WeAll Canada Stewards” in Lato; circle mark as icon.
- Credit WEAll / Sensetribe-style illustrations when reused.

## Circle system (creative core)

The WEAll circle already looks like overlapping arcs — a natural metaphor for **sociocracy circles** (overlapping domains, shared centre). Treat it as a modular SVG, not a flat PNG, wherever motion or variants matter.

### 1. Master mark (alliance)

- Full multicolour ring = WeAll Canada as a whole.
- Used in: light header (home link), PWA icon, login success, public landing.
- Motion (subtle, respectful of `prefers-reduced-motion`):
  - **Idle:** almost still; optional very slow rotate of the colour spectrum (~60–90s/turn) or a soft “breath” opacity on one arc.
  - **Hover / focus:** arcs advance a few degrees or brighten in sequence (like a handshake around the ring).
  - **Navigate home:** brief “gather” — arcs snap into the full spectrum.

### 2. Sociocracy circle variants

Yes — create **tinted / segmented versions** so each working circle has a recognisable mark without inventing unrelated icons.

**Recommended model (prototype):**

| Layer | Meaning |
| --- | --- |
| Ring colour | That sociocracy circle’s primary brand colour (from the WEAll palette or an assigned token) |
| Second arc (optional) | Secondary accent if the circle has a paired theme |
| Hollow centre | Shared empty centre = consent / common ground; never fill with a face or letter unless needed for tiny avatars |
| Small multi-speck (optional) | Tiny remnant of full spectrum at one point on the ring = “still part of WeAll” |

**Assignment:** each Circle record in the DB gets `color_primary` (and optional `color_secondary`) from a curated token list — not free-form hex from users (keeps the system coherent). Admins pick from swatches.

### WeAll Canada circle → swatch map

| Sociocracy circle | Status | Primary token | Feel / notes |
| --- | --- | --- | --- |
| **Central Circle** | Active | Full spectrum **master** mark (or `--color-ink` ring + spectrum speck) | Coordination hub — reads as “the whole,” not one niche colour |
| **Knowledge Building** | Active | `--color-cyan` | Learning, clarity, shared sense-making |
| **Policy** | Active | `--color-blue` | Steady, institutional |
| **Liberating Tools** | Active | `--color-orange` | Practical, inventive, energetic |
| **Grassroots** | **Dormant** | `--color-green` at ~40% opacity / dashed arc | Still in the system; visually quiet until revived |

When a steward belongs to **many** circles, keep the **master mark** in the header; on profile/dashboard show a **bracelet of mini-circles** for memberships. Dormant circles appear in admin/directory with a “Dormant” label and muted mark — not offered as a primary join target unless an admin reactivates.

### 3. Fun but useful UI moments

- **Dashboard bento:** panel accent bar matches the circle colour if the panel is circle-scoped (e.g. “Policy updates” → blue arc + blue stripe).
- **Directory filters:** filtering by circle morphs a small preview mark beside the filter chip into that circle’s variant.
- **Apply / join request:** submitting a join request does a short “arc draws in” animation in that circle’s colour.
- **Consent / decision (later):** when a proposal passes, arcs complete the ring (empty → full) in the circle’s colour — a tiny celebration of closing the loop.
- **Loading:** indeterminate progress as a single arc chasing around the ring (not a generic spinner).
- **Notifications:** unread badge sits in the circle’s hollow centre (careful with contrast).
- **Empty states:** a faint mono-circle with one missing arc (“not formed yet”) + short Lato copy.
- **Network / connecting (later):** two circle marks with overlapping arcs — literal sociocracy overlap for connection strength.

### 4. Motion principles

- Prefer **arc motion and colour sequencing** over bounce/elastic gimmicks.
- Cap continuous animation; always honour `prefers-reduced-motion: reduce` (static final frame).
- 2–3 intentional motions in v1 is enough: header hover, page enter, one success/join moment.
- No rainbow strobing, no perpetual spin on every page.

### 5. Implementation note

- Prefer **inline SVG** (or a sprite of arc paths) driven by CSS variables (`--circle-a`, `--circle-b`, …) so sociocracy colours swap without new PNGs.
- Keep the official PNG as fallback / Open Graph if needed.
- Tokenize circle swatches in `tokens.css` under a `--circle-*` or `--org-circle-*` group.

## Voice

- Short, clear, human. Concrete actions (“Apply”, “Approve 3 applicants”).
- Friendly, not jokey; hopeful without slogan spam.
- Empty/error states plain and kind.

## Token contract (single source of truth)

Implement once (e.g. `src/styles/tokens.css`):

```css
:root {
  /* Brand — from weall.org */
  --color-cyan: #00a9e0;
  --color-yellow: #fdda24;
  --color-orange: #ff8200;
  --color-green: #10b726;
  --color-blue: #0c4da2;
  --color-lime: #84bd00;
  --color-hot: #fa4616;

  --color-ink: #000000;
  --color-ink-soft: #262626;
  --color-body: #000000;
  --color-muted: #666666;
  --color-surface: #ffffff;
  --color-surface-subtle: #f0f0f0;
  --color-inverse: #050707;

  /* Semantic */
  --color-primary: var(--color-ink);
  --color-primary-text: var(--color-surface);
  --color-accent: var(--color-yellow);
  --color-accent-text: var(--color-ink);
  --color-highlight: var(--color-cyan);
  --color-success: var(--color-green);
  --color-warning: var(--color-orange);
  --color-danger: var(--color-hot);

  /* Sociocracy circle swatches (assign in admin; extend as needed) */
  --swatch-1: var(--color-cyan);
  --swatch-2: var(--color-yellow);
  --swatch-3: var(--color-orange);
  --swatch-4: var(--color-green);
  --swatch-5: var(--color-blue);
  --swatch-6: var(--color-lime);
  --swatch-7: var(--color-hot);

  --font-display: "Rubik Mono One", Calibri, "Lucida Grande", sans-serif;
  --font-sans: Lato, Calibri, "Lucida Grande", sans-serif;
  --font-ui: Nunito, Lato, sans-serif;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;
  --text-hero: clamp(2.5rem, 6vw, 4.5rem);

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-pill: 999px;

  --shadow-soft: 0 1px 2px rgba(0, 0, 0, 0.06);
  --max-width: 72rem;
  --header-height: 4rem;
}
```

**Rules:** no raw hex outside tokens; semantic tokens in components; light app chrome; honour reduced motion.

## Colour usage (minimal + colourful)

| Use | Token |
| --- | --- |
| Primary button | Black fill, white text |
| Secondary / highlight | Yellow fill, black text |
| Links / focus | Cyan |
| Success / warning / danger | Green / orange / hot |
| Circle-scoped UI | That circle’s assigned swatch |
| Bento stripe | One accent only |
| App background | White / subtle grey |

Yellow-on-white fails contrast — use black-on-yellow or yellow-on-black for text/buttons.

## Layout primitives

### 1. Public shell (`/stewards`)

- Light header: animated master circle (home), text nav, Apply + Login pills.
- Hero: Rubik Mono One headline, one Lato sentence, black + yellow pills. Optional colour block / illustration — keep minimal.

### 2. Auth / apply

- Single column; clear labels; join success plays “arc completes” in accent or chosen circle colour.

### 3. App shell (signed in)

- Light header; circle alone → dashboard/home.
- In-app titles: Lato bold; Rubik Mono One reserved for public/celebration.
- Bento panels: optional mono-circle glyph in the panel header when circle-scoped.

### 4. Email (admin / lead)

- Desktop split view; confirm-send modal; keep chrome calm (colour in status dots, not full rainbow toolbars).

## Components (temporary)

| Component | Guidance |
| --- | --- |
| Primary button | Black pill, white label |
| Accent button | Yellow pill, black label |
| Quiet button | Subtle / ink text |
| Links | Cyan |
| Directory | Open rows; circle filter chips with mini marks |
| Forms | Labels above; simple fields |
| Avatars | Circle crop; optional ring colour = primary sociocracy circle |
| Header logo | Master circle alone, SVG, light motion |

## PWA

- Name: “WeAll Canada Stewards”.
- Theme colour: black or cyan.
- Icons: master circle.
- Standalone; nav works without browser chrome.

## Swapping the temporary look

1. Update `tokens.css` (+ fonts / SVG arc colours).
2. Adjust shell if layout patterns change.
3. Leave feature routes alone unless structure changes.

## Still open (light)

1. After first UI spike: is Lato-bold in-app too quiet? (easy to bump key titles to Rubik Mono One).
2. WCAG AA as hard gate for prototype? (Recommended: yes for text/UI; decorative arcs can be exempt.)
3. Confirm or tweak the circle colour assignments above if any feel wrong in a real UI mock.
