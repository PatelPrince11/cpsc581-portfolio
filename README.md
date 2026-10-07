# CPSC 581 Portfolio — Prince Patel

Static site with no build step. Open `index.html`, or run a local server:

```bash
python3 -m http.server 4581
```

## Structure

```
index.html        Home: hero playground, work, design philosophy, growth log, about
project-1.html    Case study: A Family of Buttons
css/style.css     All styles (light/dark, reduced motion/transparency, high contrast)
js/site.js        Nav state, scroll reveal, section highlighting, image lightbox
js/bubbles.js     Draggable bubble physics (hero + movement demo)
assets/p1/        Project 1 figures
```

## Adding Project 2 / 3

1. Copy `project-1.html` to `project-2.html` and keep the chapter structure:
   brief → diverge → pattern → converge → refine → build → contribution → reflection.
2. Put figures in `assets/p2/`. Wrap each one in `<button class="fig">` so it opens in the lightbox.
3. In `index.html`, replace the matching "In progress" card with an `<a class="card project">` tile.
4. Update the **growth log**, and bump the **philosophy** to v2 with a note on what changed.
5. Update the pager at the bottom of the previous case study.

## Before submitting

Search for `class="todo"`. Those dashed boxes mark content only you can supply. Fill them in or delete them.

## Publishing (GitHub Pages)

Push this folder to a GitHub repo, then go to Settings → Pages → Deploy from branch → `main` / root.
