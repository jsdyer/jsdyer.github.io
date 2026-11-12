# Your GitHub workshop

Timefold includes a few GitHub features you can actually try. Everything in this guide uses fictional demo data; keep your real archive in `var/`, outside Git.

## Open a private playground with Codespaces

[Create a Timefold Codespace](https://codespaces.new/jsdyer/jsdyer.github.io?ref=main) or choose **Code → Codespaces → Create codespace on main** in the CoolCode repository. GitHub opens an editor and terminal in your browser. The development container installs PHP, initializes a SQLite archive with fictional capsules, and starts the app on port **8000**.

The creation log prints a generated owner password. If you missed it, open a terminal and run:

```sh
cd tools/timefold
php bin/timefold.php password
```

Copy the new password, open the **Ports** panel, and follow the port 8000 browser link. Leave its visibility **Private**. Your Codespace is a development environment, not permanent archive hosting. Codespaces consumes your GitHub compute quota; stop it when finished.

Try editing `tools/timefold/public/assets/` and refreshing the browser. PHP changes also take effect without compiling. Use the editor's Source Control panel to review the diff before committing. Generated configuration and archive files are ignored by Git.

## See Actions test two different databases

Open [Actions → Timefold · Check the archive](https://github.com/jsdyer/jsdyer.github.io/actions/workflows/checks.yml). Every push to `main` and every pull request runs checks with PHP 8.2 and 8.3, plus a separate MariaDB 11 service. Expand a job to see its test output.

This is a useful way to experiment: create a branch, make a small change, and open a pull request. The **Checks** tab shows what still works; **Files changed** shows exactly what you changed. You can merge your own branch after reviewing it. The **Run workflow** button also starts a fresh run without changing code.

## Download a release, or make one

The [Releases page](https://github.com/jsdyer/jsdyer.github.io/releases) holds ready-to-extract Timefold source ZIPs and `SHA256SUMS`. These releases package only `tools/timefold/`, so the ZIP can also be installed on its own. After downloading both assets into one directory:

```sh
sha256sum -c SHA256SUMS
unzip timefold.zip
```

The checksum detects an incomplete or changed download. The ZIP contains source code, not anyone's private archive.

To make the next release from your own machine:

```sh
git tag timefold-v1.1.0
git push origin timefold-v1.1.0
```

The **Pack a Timefold release** workflow tests the code, then creates the ZIP, checksum, and GitHub release automatically. Choose an unused tag beginning with `timefold-v`. You can also run that workflow manually; manual runs produce a downloadable **Actions artifact** without creating a release. Artifacts are temporary build downloads, while release assets remain attached to the version.

## Use issue forms as a personal project notebook

Choose [Issues → New issue](https://github.com/jsdyer/jsdyer.github.io/issues/new/choose), then a Timefold form. The idea form asks for one concrete thing you want to do and its smallest useful version. A bug form asks for reproduction steps. These forms live in `.github/ISSUE_TEMPLATE/` at the repository root, so you can change the questions yourself.

When a pull request implements an issue, put `Closes #12` in its description, replacing `12` with your issue number. GitHub links the work and closes the issue when the pull request merges into the default branch.

## Edit from the browser and share exact code

While viewing this repository, press **`.`** to open the `github.dev` editor. It can edit and commit files without starting a Codespace; it does not run PHP. This is handy for tweaking colors or notes, then letting Actions check the change.

While viewing a source file, press **`y`** to turn its URL into a permanent link to that exact commit. Click a line number, then use **Copy permalink** to point your future self at the same code even after the file changes.

## Compare an experiment with the original

Create a branch before a wild redesign. The [Compare view](https://github.com/jsdyer/jsdyer.github.io/compare) lets you select that branch and see its complete diff against `main`. You can review an experiment before opening a pull request, or compare two release tags to see what changed between versions.

Timefold's app stays in `tools/timefold/`; repository features such as Actions and Codespaces live at the CoolCode repository root. A branch keeps your original version available while you explore.

## Let Dependabot propose maintenance changes

`.github/dependabot.yml` asks GitHub to check Docker images and Actions once a month. When an update is available, Dependabot opens a pull request explaining it. You can inspect the diff, read the checks, and choose whether to merge. It does not update or restart your installed archive automatically.
