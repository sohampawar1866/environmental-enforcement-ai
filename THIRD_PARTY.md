# Third-party components and model provenance

| Component | Use | Version/source | License and notes |
|---|---|---|---|
| Baraa littering-detection checkpoint | Person + trash detector | Release v1.0.0 `best.pt`; expected size 40,498,732 bytes; SHA-256 `03f3b009da8d8f2570f95dbd0cca2496a0f0fb2ff2c6d2f4efa549999b5ffc2f`; [release](https://github.com/BaraaAlsaker/littering-detection/releases/download/v1.0.0/best.pt) | Source repository is AGPL-3.0. User reports personal author permission to use/modify; the permission's scope for checkpoint, distribution, and commercial use has not been independently documented. Confirm before redistribution. |
| Ultralytics | YOLO runtime and ByteTrack integration | `ultralytics==8.4.171` | Ultralytics AGPL-3.0/commercial licensing applies separately. Review terms for intended deployment/distribution. |
| PyTorch / torchvision | Tensor runtime | `torch==2.7.1`, `torchvision==0.22.1` | BSD-style licenses; retain upstream notices in distributed environments. |
| OpenCV | Video decode, encode, image evidence | `opencv-python-headless==4.10.0.84` | Apache-2.0. |
| FastAPI / Uvicorn | Local API/server | pinned in `pyproject.toml` | MIT/BSD-3-Clause. |
| SQLAlchemy | SQLite persistence | pinned in `pyproject.toml` | MIT. |
| React / Vite | Local review interface | pinned in `frontend/package.json` | MIT. |
| TypeScript | Local review interface compiler | pinned in `frontend/package.json` | Apache-2.0. |
| lucide-react | UI icons | pinned in `frontend/package.json` | ISC. |

No training dataset is bundled. Test/demo videos are to be staged by the user and must remain local unless their rights allow sharing. Generated incident records are candidate evidence for human review, not proof of wrongdoing.
