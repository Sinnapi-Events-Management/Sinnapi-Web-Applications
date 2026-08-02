# Video attribution

## auth-hero.mp4

Wedding ceremony décor — cream drapes, pampas and floral arrangements.

|             |                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **Source**  | "A wedding ceremony set up with white drapes and flowers"                                                |
| **URL**     | https://www.pexels.com/video/a-wedding-ceremony-set-up-with-white-drapes-and-flowers-20697239/           |
| **License** | [Pexels License](https://www.pexels.com/license/) — free for commercial use, **no attribution required** |

No credit line is legally required for this asset. This file exists to record
provenance so the asset can be traced or replaced later.

### Modifications made

- Centre-cropped from 3840×2160 (16:9) to a **1:1 square master**, then scaled to 1080×1080
- Ping-pong loop: the clip plays forward then reversed, so it repeats with no seam
- Audio removed (silent backdrop)
- H.264, CRF 26, faststart — 1.26 MB, 13.2s

### Why the master is square

The showcase panel is `md={6} lg={7}` at `100dvh`, i.e. **portrait-ish** (~0.8–0.93
aspect). `AuthShowcaseBackdrop` renders the video with `object-fit: cover`, which
crops whatever it is given to that shape.

A 16:9 master in a 0.93 panel shows only ~52% of its width; the backdrop's
`transform: scale()` then trims more. That is what made an earlier 16:9 asset look
zoomed-in and cut off.

A 1:1 master keeps ~88% of its width visible across the same range.

**Keep any replacement square, and prefer wide, uncluttered compositions** — tight
close-ups do not survive the crop.
