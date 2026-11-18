#!/usr/bin/env python3
"""Build both real Dockerfiles and exercise disposable containers.

--php current uses the committed images. --php 8.5 changes only the FROM
version in temporary copies, reproducing the PHP upgrade PRs without changing
the working tree. No user archive, credentials or running services are used.
"""
from __future__ import annotations

import argparse
import http.client
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

APP = Path(__file__).resolve().parent.parent
REPO = APP.parent.parent
PASSWORD = "Timefold-disposable-container-test"


def run(*args: str, capture: bool = False, **kwargs) -> str:
    result = subprocess.run(args, check=True, text=True, capture_output=capture, **kwargs)
    return result.stdout.strip() if capture else ""


def candidate(source: Path, target: Path, version: str) -> str:
    content = source.read_text()
    match = re.match(r"FROM php:(\d+\.\d+)-(?:apache|cli)-bookworm\n", content)
    if not match:
        raise ValueError(f"Review the changed PHP base-image format in {source}")
    if version != "current":
        start, end = match.span(1)
        content = content[:start] + version + content[end:]
    target.write_text(content)
    return match.group(1) if version == "current" else version


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--php", choices=["current", "8.5"], default="current")
    version = parser.parse_args().php
    suffix = uuid.uuid4().hex[:12]
    app_image = f"timefold-ci:{suffix}"
    dev_image = f"timefold-dev-ci:{suffix}"
    container = f"timefold-ci-{suffix}"
    started = False
    try:
        with tempfile.TemporaryDirectory(prefix="timefold-docker-") as temporary:
            directory = Path(temporary)
            for source, image, context in [
                (APP / "Dockerfile", app_image, APP),
                (REPO / ".devcontainer/Dockerfile", dev_image, REPO / ".devcontainer"),
            ]:
                dockerfile = directory / ("app.Dockerfile" if image == app_image else "dev.Dockerfile")
                expected = candidate(source, dockerfile, version)
                run("docker", "build", "--pull", "-f", str(dockerfile), "-t", image, str(context))
                actual = run("docker", "run", "--rm", "--entrypoint", "php", image,
                             "-r", 'echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;', capture=True)
                if actual != expected:
                    raise AssertionError(f"Expected PHP {expected}, got {actual} in {image}")
                print(f"PASS: {image} runs PHP {actual}", flush=True)

            # Reuse the storage/backup regression suite inside both built images.
            run("docker", "run", "--rm", "--entrypoint", "php",
                "-v", f"{APP / 'tests'}:/var/www/html/tests:ro", app_image, "tests/run.php")
            run("docker", "run", "--rm", "-v", f"{APP}:/workspace:ro", "-w", "/workspace",
                dev_image, "php", "tests/run.php")

            # Exercise the actual Apache image, entrypoint and file permissions.
            run("docker", "run", "-d", "--name", container, "-p", "127.0.0.1::80",
                "-e", "TIMEFOLD_DSN=sqlite:/var/www/html/var/archive.sqlite",
                "-e", f"TIMEFOLD_PASSWORD={PASSWORD}", "-e", "TIMEFOLD_SEED_DEMO=0", app_image)
            started = True
            port = run("docker", "port", container, "80/tcp", capture=True).split(":")[-1]
            base = f"http://127.0.0.1:{port}"
            for attempt in range(40):
                try:
                    with urllib.request.urlopen(base + "/api.php?action=session", timeout=2) as response:
                        if response.status == 200:
                            break
                except (urllib.error.URLError, OSError, http.client.HTTPException):
                    # Docker can accept/reset a connection before Apache starts.
                    pass
                time.sleep(0.5)
            else:
                raise RuntimeError("The disposable Apache container did not become ready")
            environment = dict(os.environ)
            environment.update(TIMEFOLD_TEST_BASE_URL=base, TIMEFOLD_TEST_PASSWORD=PASSWORD)
            run(sys.executable, str(APP / "tests/http_smoke.py"), env=environment)
    finally:
        if started:
            subprocess.run(["docker", "logs", container], check=False)
            subprocess.run(["docker", "rm", "-f", container], check=False)
        subprocess.run(["docker", "image", "rm", "-f", app_image, dev_image], check=False)


if __name__ == "__main__":
    main()
