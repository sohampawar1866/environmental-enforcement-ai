# Environmental Hacks — Reproducibility Audit

**Status: source review and limited smoke reproduction complete; no candidate has passed real-scene litter-event validation.**
Audit date: 2026-10-02. No training or product implementation was performed.

## Scope and execution environment

This audit follows the project specification and the separate user request in the attached pasted text. The specification supplies project requirements; it does not override the user's explicit audit boundary. Candidate downloads, checkpoint loading, focused tests, and smoke inference were carried out in isolated locations under `/private/tmp`. No candidate source, checkpoint, test footage, or dataset was added to this project directory.

Machine: macOS ARM64, Python 3.13.5, PyTorch 2.7.1 CPU build, no CUDA/MPS. The isolated venv used Ultralytics 8.4.171, OpenCV headless 4.10.0.84, torchvision 0.22.1, and `lap` 0.5.13. Candidate weights and source were not modified. Inference used CPU.

The available test assets were not representative fixed-camera footage of a person discarding litter. Consequently, successful loading and plumbing checks below prove artifact/runtime compatibility only, not detection quality or event attribution.

## Candidate comparison

| Candidate | Reproduction and evidence | What it contributes | Gaps and assessment |
|---|---|---|---|
| [Baraa — littering-detection](https://github.com/BaraaAlsaker/littering-detection) | Cloned commit `c5b514fa8910bc2f186b3b6e2549a3343de2f3fd` (2026-06-11). Release [v1.0.0](https://github.com/BaraaAlsaker/littering-detection/releases/tag/v1.0.0) checkpoint downloaded: 40,498,732 bytes, SHA-256 `03f3b009da8d8f2570f95dbd0cca2496a0f0fb2ff2c6d2f4efa549999b5ffc2f`. Loaded on CPU with Ultralytics 8.4.171 / PyTorch 2.7.1. Verified YOLO11m DetectionModel, `{0: person, 1: trash}`. On bundled Ultralytics `bus.jpg`, it returned 3 person boxes (.700, .487, .461). A 15-frame synthetic chart video processed 15/15 frames, wrote an annotated clip, and yielded 0 events/evidence. A 15-frame synthetic video made from a highly mosaicked image processed 15/15, tracker IDs persisted across sampled frames, and it yielded 0 events/evidence. | Only audited candidate with a released, verified person+trash checkpoint and task-specific event code. Notebook includes calibration for existing trash, persistence, proximity, carry heuristic, tracking, annotation, and evidence. | The synthetic videos are plumbing checks, not a meaningful accuracy test. Notebook event logic can fire when persistent new trash is near any person; it does not establish owner identity, require separation/stationarity or owner departure, or cancel on pickup. Event records do not preserve actor/track IDs. `requirements.txt` omits `lap`, which this installed ByteTrack path needed; we installed it separately to continue. Private training data/video absent. Repo is AGPL-3.0. User reports author permission to use/modify; scope, checkpoint rights, and redistribution should be recorded. **Best verified detector baseline, but event logic must not be treated as validated.** |
| [CivicSense](https://github.com/muhammad-fiaz/civicsense) | Source and focused tests checked out. Downloaded and loaded default `yolo26n.pt`, 5,544,453 bytes, SHA-256 `9b09cc8bf347f0fc8a5f7657480587f25db09b34bf33b0652110fb03a8ad4fef`. It is an 80-class COCO model (`person` 0, `bottle` 39; no trash/litter class). On `bus.jpg`, detected bus (.881) and people (.872, .861, .846, .656). Focused tests: `tests/ai/test_littering_engine.py`, `test_event_classifier.py`, `test_tracker.py`: **22 passed**. | Best reusable event-logic reference: state per waste track, near-hand → left-hand → falling → ground, and dustbin exclusion. Modular app, test structure, API/UI/evidence ideas. | COCO objects used as waste proxies; this is not a litter-trained detector. Classifier uses center proximity and any nearby person's hand, and can lose attribution if a track misses one frame. No owner-departure/pickup-return confirmation. Tests are component tests, not video/model integration. GPL-3.0-only repo; Ultralytics dependency has separate AGPL-3.0 terms. **Best state-machine reference, not detector foundation.** |
| [BiaEye](https://github.com/RaneemSadeh/BiaEye-Smart-Waste-Vision) + [HF checkpoint](https://huggingface.co/raneemsadeh/biaeye-yolo11s) | Downloaded HF `best.pt` (19,155,475 bytes; SHA-256 `37727b33c2b45c1c1b7bdd92d2a590a8d9f02734e5f5d7e1db7d84558ea6a517`), revision `c9c4664a041072e78572330dfc770d2518ee2bba`; loaded with Ultralytics 8.4.171 / PyTorch 2.7.1. Classes: plastic, paper, glass, metal, organic, bulky. Inference on four available heavily mosaicked dataset images returned no detections. | A second loadable fine-tuned waste-material detector for later same-footage comparison. Model card claims six-class mAP50 .259 and class-agnostic .405; these are author-reported, not independently verified. | GitHub demo uses base `yolo11s.pt`, a hardcoded webcam and zone counter; it does not use this HF checkpoint or implement tracking/event attribution. Images were too mosaicked to judge the four no-detection results. GitHub README shows MIT badge but repository has no LICENSE file; HF card states MIT; dataset source has separate terms. **Detector comparison candidate only.** |
| [TRACE](https://github.com/Arnab500th/Hackathon-Automated-Littering-Detection-and-Alert-System-for-Public-Spaces) | Source tree reviewed; no execution. README-listed `ml_pipeline/weights/yolov8s.pt` and `taco_8s_v3.pt` are missing from tracked repository paths. | Useful system decomposition, camera configuration, temporal/evidence concepts, SQLite/FastAPI reference. | Broad unpinned requirements, Windows-specific paths, questionable import assumptions, no weights. README says MIT but no license file; also calls it research/academic use. **Architecture reference only.** |
| [LitterLens](https://github.com/Aaklon/litterlens) | Source reviewed; no execution. Five-file repo has no tests, requirements, license, or litter weights. Default `LITTER_MODEL_PT` is empty. | Before/during/after buffering, separate person/litter tracking, evidence grid/clip, optional VLM review concept. | Requires user-supplied detector and a CUDA-oriented Qwen VLM stack. Referenced pipeline document is missing. No explicit license. **Ideas only.** |
| [Illegal-Dumping-Action-Detection](https://github.com/vraj1231/Illegal-Dumping-Action-Detection/tree/Sub_branch) | Source tree and notebook reviewed; no execution. Tracked models include `models/human-detection/crowdhuman_yolov5m.onnx`, `models/license-plate/license-plate-ALPR.onnx`, and `models/trash-detection/trash_detection.pt`; byte-level download/load was not completed. | Possible later vehicle/plate/OCR reference. | Notebook uses inconsistent Windows paths and expected files not matching repository paths; no root requirements/tests or dataset. README describes YOLOv5, OCR, DeepSORT and distance-based attribution. Apache-2.0 repo does not establish third-party/model/data terms. **Not a reproducible foundation.** |

## Recommendation

Use a **conditional component combination** for the next small validation step: Baraa's verified YOLO11m person/trash checkpoint and Ultralytics ByteTrack for detection/tracks, with CivicSense's state-machine concepts as a reference for an explicit event timeline. Do not transplant either candidate's event module unchanged. Baraa's source logic is too weak for owner attribution; CivicSense's current generic detector and association assumptions are not sufficient evidence of an end-to-end solution.

This is the most concrete recommendation supported by the audit, but **no candidate has yet demonstrated reliable litter-event detection on representative footage**. Before implementation, obtain one fixed-camera clip with clear drop, existing litter plus passerby, and pickup/return examples, with documented permission to use it. Then compare the two loaded detectors on the same clip and validate person/object association frame by frame. No training is justified before that gate.

## Provisional architecture for that validation

```text
licensed representative fixed-camera clip
  → Baraa YOLO11m detector (person + trash)
  → ByteTrack IDs
  → explicit per-object states and actor association
       approach/near hand → separation/drop → stationary on ground
       → owner leaves → cancel if picked up/returned
  → candidate incident + before/drop/after evidence
  → human review
```

Start with file video and a compact inference/evaluation harness. Defer OCR, alerts, cloud services, custom training, API, database, and dashboard until this path demonstrates repeatable event behavior. Keep every output as a human-review candidate; do not trigger penalties.

## Staged plan after the review gate

1. **Data gate:** secure a representative, permissioned fixed-camera sample and label the three event cases above. Keep original clip and labels out of the public repo unless rights permit.
2. **Pinned baseline:** create a clean environment, pin Python/runtime and all inference dependencies including `lap`, record device and checkpoint URL/size/SHA, and rerun the model smoke test.
3. **Same-video detector comparison:** run Baraa YOLO11m and BiaEye YOLO11s on identical frames/settings; record per-class detections, misses, false alarms, speed, and visual overlays. Do not compare author-reported metrics as if measured on this footage.
4. **Temporal validation:** define explicit transitions and actor/object association; test discard, pre-existing litter with passerby, occlusion, pickup/return, and bin disposal. Review frame-by-frame clips and false event cases.
5. **Foundation decision:** decide based on measured footage results, attribution errors, runtime, model/data rights, and intended distribution. If performance is insufficient, collect/label data before considering training.
6. **Local product integration:** only after the vision gate, choose whether to implement a thin review tool or adapt a candidate app. Document all code/model/data licenses before sharing or deployment.

## Licensing and provenance

- Baraa repository is AGPL-3.0. The user reports separate author permission to use/modify; permission scope and whether it covers released weights and redistribution have not been independently verified. Ultralytics has separate AGPL/commercial licensing terms.
- CivicSense is GPL-3.0-only. Review compatibility and obligations before combining or distributing code.
- BiaEye GitHub repository has an MIT badge but no LICENSE file; the separate Hugging Face model card says MIT. Dataset/source-image terms remain separate.
- TRACE has no repository LICENSE file despite README licensing language. LitterLens has no license statement.
- Illegal-Dumping-Action-Detection is Apache-2.0, but third-party code, models, and dataset terms require separate review.
- Preserve dataset/source attribution and verify image-level rights before training or redistribution.

## Source links

- [Baraa repo](https://github.com/BaraaAlsaker/littering-detection) · [release v1.0.0](https://github.com/BaraaAlsaker/littering-detection/releases/tag/v1.0.0) · [notebook](https://github.com/BaraaAlsaker/littering-detection/blob/main/littering_detection.ipynb) · [requirements](https://github.com/BaraaAlsaker/littering-detection/blob/main/requirements.txt) · [license](https://github.com/BaraaAlsaker/littering-detection/blob/main/LICENSE)
- [CivicSense repo](https://github.com/muhammad-fiaz/civicsense) · [litter event engine](https://github.com/muhammad-fiaz/civicsense/blob/main/civicsense/ai/littering_engine.py) · [detector](https://github.com/muhammad-fiaz/civicsense/blob/main/civicsense/ai/detector.py) · [license](https://github.com/muhammad-fiaz/civicsense/blob/main/LICENSE)
- [BiaEye repo](https://github.com/RaneemSadeh/BiaEye-Smart-Waste-Vision) · [HF model card](https://huggingface.co/raneemsadeh/biaeye-yolo11s)
- [TRACE](https://github.com/Arnab500th/Hackathon-Automated-Littering-Detection-and-Alert-System-for-Public-Spaces) · [LitterLens](https://github.com/Aaklon/litterlens) · [Illegal-Dumping-Action-Detection](https://github.com/vraj1231/Illegal-Dumping-Action-Detection/tree/Sub_branch)
