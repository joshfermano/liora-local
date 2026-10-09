# Tell Liora app icon

**The one lit window in a dark house.** At 2 AM, when she has to decide alone, her phone is the one
lit window in the house. The icon is that window: an arched capiz window (light comes in, the room
stays private), lit from inside, with one peony pane for her. It is the same window as the art on
her Today screen, so the icon and the app tell one story.

![Tell Liora icon](../../assets/images/icon.png)

## Files

| File | Use |
| --- | --- |
| `assets/images/icon.svg` | Source of truth. Edit this, then re-render. |
| `assets/images/icon.png` | iOS **Light** and the default icon, 1024 px, full-bleed, no alpha. |
| `assets/images/icon-dark.png` | iOS **Dark**: the window on transparency; iOS draws the dark backdrop. |
| `assets/images/icon-tinted.png` | iOS **Tinted**: grayscale on black; iOS tints by brightness. |
| `assets/images/favicon.png` | Browser tab and web export, 48 px. |

`app.json` wires all of them (`expo.icon`, `expo.ios.icon.light/dark/tinted`, `expo.web.favicon`).
iOS reads the icon at build time, so a change shows after the next native build, not live reload.

Re-render from the SVG (ImageMagick with librsvg):

```bash
magick -background '#1D1519' assets/images/icon.svg -flatten -alpha off assets/images/icon.png
```

## Construction

- **Grid:** 1024 canvas. Arched window 520 wide (outer arch radius 260), scaled 110% about its
  centre so it fills the tile like its neighbours on the Home Screen. Frame 36, muntins 20, panes
  136, a sill 28 tall.
- **Lattice:** three columns; the arch splits into three, then two square rows. The peony pane is
  the first row, right column, as in the Today art.
- **Colours** (DESIGN.md tokens only, flat):

  | Part | Token | Hex |
  | --- | --- | --- |
  | Ground | Night Window (surface-dark) | `#1D1519` |
  | Frame, muntins, sill | Hardwood (frame) | `#5E4036` |
  | Lit panes | Lit Shell (lit) | `#FBCFA8` |
  | Her pane | Peony Fill (tint-fill) | `#C2255C` |

## Use it right

- **Do** let iOS round the corners. The PNG is a full square; never bake in corners or a border.
- **Do** keep it flat. DESIGN.md's One Light Rule: no gradient, glow, shadow or gloss on icons.
- **Do** keep at least a quarter of the window's width clear around it when it sits on a page
  (README, slides, the submission page), on Pearl Ground `#F2ECF1` or Night Window `#1D1519`.
- **Do** pair it with the wordmark "Liora" in Marcellus when a name is needed; the product name in
  sentences is "Tell Liora".
- **Don't** add text, a badge or a second colour to the icon. Peony stays on one pane only.
- **Don't** recolour the panes; Lit Shell and Hardwood belong to the icon alone.
- **Don't** use it below 29 px except as the 48 px favicon; the lattice needs room to read.
- **Don't** place it on photos or busy backgrounds, or stretch, rotate or outline it.
