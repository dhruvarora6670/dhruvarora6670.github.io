# dhruvarora6670.github.io

Personal site of Dhruv Arora, platform and backend engineer. Plain HTML, CSS and a little JavaScript: no build step, no framework, nothing to install to publish it.

```
index.html                 the whole homepage
assets/css/site.css        all styles (theme colours are at the top)
assets/js/site.js          theme toggle, phone menu, header, active nav link
assets/Dhruv_Arora_Resume.pdf
assets/og.png              preview image for LinkedIn/Slack/WhatsApp links (1200×630)
blog/post-template.html    copy this to write a post
404.html                   "page not found" (GitHub Pages uses it automatically)
favicon.svg, favicon-32.png, apple-touch-icon.png
robots.txt, sitemap.xml    for search engines
.nojekyll                  tells GitHub Pages to serve the files as they are
tools/                     optional layout check (not needed to publish)
```

## Publish on GitHub Pages (about 5 minutes)

1. On GitHub, create a **public** repository named exactly `dhruvarora6670.github.io`.
2. Upload everything in this folder to it (keep the folder structure), or from a terminal:

   ```bash
   cd dhruvarora6670.github.io
   git init -b main
   git add .
   git commit -m "Portfolio site"
   git remote add origin https://github.com/dhruvarora6670/dhruvarora6670.github.io.git
   git push -u origin main
   ```

3. In the repository: **Settings → Pages → Build and deployment**. Set **Source** to *Deploy from a branch*, **Branch** to `main` and folder `/ (root)`, then **Save**.
4. After a minute or two the site is live at **https://dhruvarora6670.github.io**. Every later push to `main` redeploys it.

If you name the repository anything else, the site lands at `https://dhruvarora6670.github.io/<repo-name>/`. The homepage still works there, but the 404 page's "Back to the homepage" link and the URLs in the SEO tags assume the site is at the root, so the name above is the one to use.

### Custom domain (optional)

1. Buy the domain, then in its DNS settings add four `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, plus a `CNAME` record for `www` pointing to `dhruvarora6670.github.io`.
2. In **Settings → Pages → Custom domain**, enter the domain and save (GitHub adds a `CNAME` file to the repo). Tick **Enforce HTTPS** once it becomes available.
3. Replace `dhruvarora6670.github.io` with your domain in `index.html`, `sitemap.xml`, `robots.txt` and `blog/post-template.html` (canonical link, `og:url`, `og:image`, JSON-LD).

## Preview on your computer

```bash
cd dhruvarora6670.github.io
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` directly from the file browser also works.)

## Common edits

- **Text:** everything is in `index.html`, one `<section>` per part of the page, in page order: hero (`#top`), `#systems`, `#experience`, `#stack`, `#case-study`, `#blog`, then the footer.
- **A new role:** copy one `<article class="role">…</article>` block in `#experience` and edit it.
- **Résumé:** replace `assets/Dhruv_Arora_Resume.pdf` with the new file, keeping the same file name, and every résumé link on the site picks it up. The current file is the Platform Engineer version with the IDP described generically, so it is safe to post publicly.
- **Colours:** the light theme is the first `:root { … }` block in `assets/css/site.css`, and the dark theme is the two blocks after it (keep those two identical).
- **Text sizes:** each rule in `assets/css/site.css` sets the size used on phones and tablets. Desktop screens (901px and wider) use the slightly smaller sizes in the *Desktop type scale* block at the end of that file, except the first screen (the hero), which keeps its original sizes; `404.html` repeats the two that apply to it.
- **Social preview image:** `assets/og.png`. After changing it, paste your URL into https://www.linkedin.com/post-inspector/ to refresh LinkedIn's cached copy.

## Publish a blog post

1. Copy `blog/post-template.html` to `blog/<short-name>.html`, for example `blog/cloud-build-trigger-limit.html`.
2. Replace every `TODO`, and delete the `<meta name="robots" content="noindex">` line so search engines can index the post.
3. In `index.html`, in the `#blog` section, swap the post's "Coming soon" badge for its date and turn its title into a link:

   ```html
   <p class="post-title"><a href="blog/cloud-build-trigger-limit.html">How I got past Cloud Build’s 600-trigger limit</a></p>
   <p class="post-tags"><time datetime="2026-11-20">Nov 20, 2026</time> · Cloud Build · CI</p>
   ```

   For the featured post, replace the badge with the date and add a link under the summary:

   ```html
   <a class="post-link" href="blog/cloud-build-trigger-limit.html">Read the post<svg width="14" height="14" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></a>
   ```

4. Add the post's URL to `sitemap.xml`.

Posting the same article on dev.to, Hashnode or Medium as well brings more readers. Set the canonical URL there to the copy on this site so search engines credit your domain.

## No sideways scrolling on phones

That blank strip you can swipe into on many sites comes from something wider than the screen: a fixed width, `100vw`, a long email or URL that can't wrap, a row that refuses to wrap, or a grid column with a minimum wider than a phone. This site avoids each of these, and when you edit it, keep to these rules:

- Use `max-width`, never a fixed `width`, for anything that holds content.
- Let rows wrap (`flex-wrap: wrap`), and give flex and grid children `min-width: 0` so they can shrink.
- In grids, write column minimums as `minmax(min(100%, 380px), 1fr)`, never a bare `380px`.
- Long strings such as email addresses need `overflow-wrap: anywhere`.
- `html` and `body` have `overflow-x: clip` as a safety net. It hides overflow rather than fixing it, which is why the check below measures the page with that net switched off.

## Layout check (optional)

`tools/check-layout.cjs` opens every page in a real browser at 15 screen widths from 320 to 1920 px, in light and dark, and fails if anything sticks out sideways, if the first screen doesn't fill the window, or if the phone menu or theme toggle breaks. It needs Node.js 20 or newer:

```bash
cd tools
npm install
npx playwright install chromium
npm run check                 # SHOTS=shots npm run check also saves screenshots
```
