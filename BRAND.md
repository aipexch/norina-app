# Timely — Brand Guidelines

## Colors

| Token              | Value     | Usage                          |
|--------------------|-----------|--------------------------------|
| `--background`     | `#F0F7F0` | App background (light mint)    |
| `--foreground`     | `#1A1A1A` | Primary text                   |
| `--card`           | `#FFFFFF` | Card backgrounds               |
| `--primary`        | `#15803D` | Buttons, active states, links  |
| `--primary-foreground` | `#FFFFFF` | Text on primary buttons    |
| `--muted`          | `#E8F0E8` | Muted backgrounds              |
| `--muted-foreground` | `#6B7280` | Secondary text, labels       |
| `--border`         | `#E2E8F0` | Card borders, dividers         |
| `--danger`         | `#EF4444` | Destructive actions            |
| `--accent-orange`  | `#F97316` | Highlights, badges             |

## Typography

- **Font family**: Inter (Google Fonts), fallback: system sans-serif
- **Titles (h1)**: 28px, font-bold, tracking-tight, color foreground
- **Subtitles**: 15px, color muted-foreground
- **Section headers**: 13px, font-semibold, uppercase, tracking-wider, color muted-foreground
- **Body**: 15px, color foreground
- **Small text**: 13px, color muted-foreground
- **Tiny/labels**: 11px, color muted-foreground

## Spacing & Layout

- **Max width**: `max-w-lg` (512px), centered with `mx-auto`
- **Page padding**: `px-5 py-6`
- **Card padding**: `p-4` or `p-5`
- **Section gap**: `space-y-6`
- **Card gap**: `gap-3`

## Components

### Cards
- Background: white (`bg-card`)
- Border radius: `rounded-2xl`
- Shadow: `shadow-sm`
- No visible border (shadow provides depth)

### Buttons (Primary)
- Background: `bg-primary` (#15803D)
- Text: white, font-medium
- Border radius: `rounded-2xl`
- Padding: `py-3.5 px-6`
- Full width where appropriate

### Buttons (Secondary/Outline)
- Background: `bg-card` (white)
- Border: `border border-border`
- Border radius: `rounded-2xl`
- Text: foreground color

### Pills/Tags
- Background: `bg-primary/10` or `bg-muted`
- Text: primary or muted-foreground
- Border radius: `rounded-full`
- Padding: `px-3 py-1`

### Bottom Navigation
- Floating pill/box centered at bottom: `rounded-2xl bg-card shadow-lg`
- Max width: 280px, centered with `justify-center`
- Icons only, no text labels
- Active: `bg-primary text-white` filled icon background
- Inactive: `text-muted-foreground`
- Icon size: 20px
- Touch target: 44x44px per icon

### Bottom Sheets / Modals
- Backdrop: `rgba(0,0,0,0.35)`
- Sheet: `rounded-t-3xl` with white background
- Drag handle: centered 40px bar

### Inputs
- Background: white or transparent
- Border: `border-border`
- Border radius: `rounded-xl`
- Focus: `border-primary` ring
- Always use custom dropdowns, never native iOS pickers

## iPhone Compatibility

- Support iPhone SE (375px) to iPhone 17 Pro Max (430px)
- Use `env(safe-area-inset-*)` for Dynamic Island and Home Indicator
- Top safe area: `pt-[env(safe-area-inset-top)]`
- Bottom safe area: `pb-[env(safe-area-inset-bottom)]`
- Touch targets: minimum 44x44px
- Font size: minimum 16px on inputs to prevent iOS zoom

## Design Principles

1. **Minimalist**: Only show what's necessary
2. **Clean**: Generous whitespace, soft shadows, no harsh borders
3. **Consistent**: Same border radius, spacing, and colors everywhere
4. **Accessible**: High contrast text, large touch targets
5. **Native feel**: Smooth transitions, iOS-like interactions
