# coolcode.ca

A lightweight personal site for Linux, networking, code and small tools. Published from this repository with [GitHub Pages](https://pages.github.com/) at **https://coolcode.ca/**.

## How it is hosted

- The repo is named `jsdyer.github.io`, which is GitHub's special user-site naming convention.
- `index.html` is the homepage; `favicon.svg` is its icon. This is a static site with no third-party frameworks or trackers.
- The existing root `CNAME` contains `coolcode.ca`, GitHub Pages' custom domain. **Do not delete it** unless intentionally changing the domain.
- `.nojekyll` tells Pages to serve the HTML files directly; the old `_config.yml` is a harmless leftover from the previous Jekyll theme.
- `tools/lanwatch/` is an independent, dependency-free Linux utility. Its data stays local, not on the website.

## Local Linux preview

```bash
sudo apt install git python3
mkdir -p ~/src && cd ~/src
git clone https://github.com/jsdyer/jsdyer.github.io.git
cd jsdyer.github.io
python3 -m http.server 8000
```

Visit `http://localhost:8000`. Edit `index.html` with any text editor and reload the browser. Stop the local server with Ctrl+C.

## Update the live website

From the repository directory:

```bash
git pull --ff-only
nano index.html
git add index.html
git commit -m "Update CoolCode homepage"
git push origin main
```

GitHub authentication is required for pushes. GitHub Pages will then publish the updated files automatically when configured to build from the `main` branch root. If publication fails, check **Repository Settings → Pages** and the repository's Actions build history.

## Other project

[LANWatch — Linux LAN availability logger](tools/lanwatch/README.md)
