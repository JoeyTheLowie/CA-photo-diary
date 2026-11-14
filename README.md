# Joe in Central America

A photo diary of 73 days from Guatemala to Nicaragua (27 Nov 2026 – 6 Feb 2027).

- **Site:** https://joeonthego.nl/
- **Editor (on a laptop):** https://joeonthego.nl/post/

## How to post

Use the editor on a laptop: https://joeonthego.nl/post/. The site is built per location, not per day.

1. Pick the **location** at the top.
2. **Import photos** (or drop them on the left). They land in the tray. Location data is removed, and photos are resized to 2048 px.
3. **Add a block** by clicking a block type (it goes at the end), or by dragging it into the preview, where it snaps in between the other blocks:
   - **Full width**: one photo, the full width of the grid and almost the full screen height (cropped).
   - **Single photo**: one photo on a row of its own, uncropped.
   - **2 or 3 side by side**: up to 4 with **+ spot**.
   - **Mosaic**: one big photo with two stacked next to it (⇄ swaps the sides).
   - **Photo + text / Text + photo**: up to 3 photos with a heading and text. On phones the text goes above or below.
   - **Quote**: one big, bold, centred line. **Text**: a heading with text next to it.
4. **Fill it**: drag photos from the tray onto the spots, or click a spot and then click photos (it moves on to the next empty spot). Drag a photo onto another to swap them, or between blocks to give it a block of its own. Click texts in the preview to type.
5. **Arrange**: drag a block by its ⠿ handle, or use ↑ ↓. Hover a block for its tools.
6. **Desktop vs phone**: both use the same order. Switch on **Deviate on desktop** to give laptops their own order (rearrange in the Desktop view; the phone keeps its order).
7. **Post**. The site updates in about two minutes.

Photos you don't place stay off the site and wait in the tray for later. Hover a photo in the tray and click × twice to delete it.

### One-time setup (per browser)

The post page needs a GitHub token that can write to this repository only.

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name it `photo diary`, set the expiration to a date after the trip (for example 1 March 2027).
3. **Repository access:** Only select repositories → `CA-photo-diary`.
4. **Permissions:** click **+ Add permissions**, choose **Contents**, and set it to **Read and write**.
5. Generate, copy, and paste it into the editor. It is saved in that browser only.


## Fixing things

All of these can be done in the GitHub app or on github.com, then the site rebuilds by itself.

| What | Where |
| --- | --- |
| Change a caption | Editor: click the photo, type the caption in the panel on the left. |
| Change how a location looks | Editor: pick the location. It is saved in `layouts/<location>.json`. |
| Remove a photo | Editor: × on the photo sends it back to the tray (off the site); × twice in the tray deletes it. |
| Change the route, dates or altitudes | `data/trip.json`. Photos move to the right stop automatically. |
| Change the site name, headline, intro or footer | Post page → **Site texts** |
| Rebuild by hand | **Actions → Process photos and publish → Run workflow** |

## How it works

- `post/` is the editor. It shows the real site in a frame (`index.html?preview&edit`, with `assets/editor.js`) and commits photos to `inbox/`, a location's blocks to `layouts/<location>.json` and deletions to `trash/`.
- `.github/workflows/publish.yml` runs `scripts/process.mjs` on every push. It makes AVIF versions at 640, 1280 and 2048 px, a JPEG fallback and a tiny blurred placeholder in `img/`, adds the photo to `data/diary.json`, empties `inbox/`, and publishes the site to GitHub Pages.
- `index.html` reads `data/trip.json` and `data/diary.json`. Locations are shown oldest first (trip order), with a "Jump to most recent" link under the intro, each as its list of blocks; only placed photos are shown.
- Preview the site as on any day of the trip with `?today=2026-12-18` at the end of the address.

Please don't upload photos straight into the repository through github.com: those would keep their location data in the history. Use the post page.
