# Make it yours

No package manager or asset build is involved. Edit a file and refresh.

1. Create a branch: `git switch -c my-darkroom`.
2. Run the local demo from the README, using sample data.
3. Change the UI in `public/assets/` or the rules in `app/`.
4. Run `php tests/run.php` and `python3 tests/http_smoke.py`.
5. Push the branch and open a pull request. The Actions tab shows the PHP and
   database checks; the Files changed tab lets you review your own patch.

For the Docker setup, rebuild after PHP or asset changes with
`docker compose up -d --build`. Your archive remains in its named volumes.
Keep real notes and images out of branches, issues, screenshots, and fixtures.

Small contributions should explain the behavior being changed and include a
meaningful check if the change affects storage, authentication, or backups.
Styling tweaks can be verified in the browser. Keep new runtime dependencies
exceptional: the small codebase is a feature.
