# Zizi’s logo system

Cat café and rescue-cat adoption corner, Bengaluru.

## Files

- `svg/zizis-lockup-full.svg` — primary logo, on cream/paper
- `svg/zizis-lockup-reversed.svg` — for forest green #36493B (transparent background, cream ink)
- `svg/zizis-lockup-burgundy.svg` — single colour, on cream/paper
- `svg/zizis-mark-{full,reversed,burgundy}.svg` — cat mark alone
- `svg/zizis-badge-{burgundy,forest}.svg` — circular badge for stickers, cups, signage, site header
- `png/*-2x.png` — raster copies (marks and badges 1024px, lockups 2×)
- `favicon/` — favicon.ico (16/32/48), favicon.svg, PNG sizes, apple-touch-icon, site.webmanifest
- `brand-tokens.css` — colour and font variables

Lockup and badge SVGs embed subsets of Fraunces (800, SOFT 100, WONK 1) and Outfit, so they render without the fonts installed. For print or signage, convert text to outlines in a vector editor.

## Favicon snippet

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#36493B">
```

## Usage

- Clear space: one ear width (about ¼ of the mark) on all sides.
- Minimum size: lockup 120px wide on screen; smaller than that, use the badge or icon.
- Calico tan and brown belong to the cat mark only.
- Don’t recolour the patches, outline the favicon, or reset the wordmark in another typeface.
