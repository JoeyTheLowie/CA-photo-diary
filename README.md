# Joe in Central America

A photo diary of 73 days from Guatemala to Nicaragua (27 Nov 2026 – 6 Feb 2027).

- **Site:** https://joeonthego.nl/
- **Post from your phone:** https://joeonthego.nl/post/

## How to post

1. Copy the photos from the camera to your phone (Sony Creators' App, or the SD card reader).
2. Open the **post** page and tap **Choose photos**.
3. Optional: add a caption, and pick a size per photo: **Normal**, **Big** (a row of its own) or **Header ★** (edge to edge, full screen height; use it for the very best shots). Add notes for the day: a short bold heading and/or text. They sit next to the photos, alternating left and right.
4. Tap **Post**. The site updates in about two minutes.

The capture date in each photo decides the day and the stop. When you land, set the camera clock to local time (UTC−6). All four countries use the same time zone, so you only do this once.

Location data never leaves the phone: the post page resizes each photo to 2048 px and saves a clean copy without any metadata.

### One-time setup on the phone

The post page needs a GitHub token that can write to this repository only.

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name it `photo diary`, set the expiration to a date after the trip (for example 1 March 2027).
3. **Repository access:** Only select repositories → `CA-photo-diary`.
4. **Permissions:** click **+ Add permissions**, choose **Contents**, and set it to **Read and write**.
5. Generate, copy, and paste it into the post page. It is saved on that phone only.

Add the post page to your home screen (Share → Add to Home Screen) so it works like an app.

## Fixing things

All of these can be done in the GitHub app or on github.com, then the site rebuilds by itself.

| What | Where |
| --- | --- |
| Change a caption, move a photo to another stop, or change its size | `data/diary.json`: edit `caption`, `stop` (add `"stopFixed": true`), or `size` (`normal`, `big` or `header`) |
| Remove a photo | `data/diary.json`: delete its entry. The image files are cleaned up on the next build. |
| Edit or delete notes | On the post page: pick the day, the existing notes load, edit and post. Or edit `notes/YYYY-MM-DD.md`: notes are separated by a line with `---`, and a first line starting with `# ` is the heading. |
| Change the route, dates or altitudes | `data/trip.json`. Photos move to the right stop automatically. |
| Rebuild by hand | **Actions → Process photos and publish → Run workflow** |

## How it works

- `post/` commits photos to `inbox/` with a small `.json` file next to each (caption, date, camera settings).
- `.github/workflows/publish.yml` runs `scripts/process.mjs` on every push. It makes AVIF versions at 640, 1280 and 2048 px, a JPEG fallback and a tiny blurred placeholder in `img/`, adds the photo to `data/diary.json`, empties `inbox/`, and publishes the site to GitHub Pages.
- `index.html` reads `data/trip.json` and `data/diary.json`. Stops are shown newest first, and each day is laid out automatically from the photos' shapes.
- Preview any day of the trip with `?today=2026-12-18` at the end of the site address.

Please don't upload photos straight into the repository through github.com: those would keep their location data in the history. Use the post page.
