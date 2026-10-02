#!/usr/bin/env python3
"""Fetch the audited Baraa v1.0.0 checkpoint and verify its immutable fingerprint."""

import hashlib
from pathlib import Path
import sys
import urllib.request

URL = "https://github.com/BaraaAlsaker/littering-detection/releases/download/v1.0.0/best.pt"
SIZE = 40_498_732
SHA256 = "03f3b009da8d8f2570f95dbd0cca2496a0f0fb2ff2c6d2f4efa549999b5ffc2f"


def main():
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("models/baraa-best.pt")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        print(f"Downloading {URL} -> {destination}")
        urllib.request.urlretrieve(URL, destination)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    size = destination.stat().st_size
    if size != SIZE or digest != SHA256:
        destination.unlink(missing_ok=True)
        raise SystemExit(f"Checkpoint verification failed (size={size}, sha256={digest})")
    print(f"Verified {destination} ({size} bytes, sha256={digest})")


if __name__ == "__main__":
    main()
