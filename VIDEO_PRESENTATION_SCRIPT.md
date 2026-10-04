# CivicClean — 3-Minute Hackathon Video Presentation Script
**AWS × WeMakeDevs Environmental Hacks 2026**  
**Track 03: Waste & Urban Cleanliness**  
**Team: House of Coders**  
**Total Target Runtime:** 3:00 (180 Seconds)

---

## Presentation Overview & Timeline Map

| Timestamp | Screen / Visual Focus | Core Topic & Narrative |
| :--- | :--- | :--- |
| **0:00 – 0:15** | Landing Page (Hero) | Problem Statement: The Crisis of Passive CCTV |
| **0:15 – 0:32** | Landing Page (Chapter 01) | Solution: Kinematic Physical Separation vs Static AI |
| **0:32 – 0:52** | Landing Page (Chapter 05) | Legal Compliance & Privacy: Why No Facial Recognition (ALPR + Ward Marshals) |
| **0:52 – 1:00** | Landing Page (Chapter 03 & CTA) | AWS Edge/Cloud Hybrid + Smooth Transition into Console |
| **1:00 – 1:20** | Live Console (Intake) | UI Experience: Light/Dark Theme Toggle & Video Ingestion |
| **1:20 – 1:45** | Review Queue (Candidate Review) | 3-Frame Temporal Evidence (Before, Separation, After) |
| **1:45 – 2:15** | Case Dossier Modal | Municipal Evidentiary Case Dossier (Not Raw JSON, Print/PDF) |
| **2:15 – 2:55** | Architecture Diagram / Chapter 03 | Deep Dive: 6 AWS Services, Purpose & Architectural Rationale |
| **2:55 – 3:00** | Closing Callout | Civic & Environmental Impact Summary |

---

## Part 1: Landing Page Storyline Walkthrough (0:00 – 1:00)

### [0:00 – 0:15] Hero Section: The Crisis of Passive Surveillance
* **Visual Action:** Start at the very top of `LandingPage`. Allow the animated background and cycling headline text (*"spots, proves, audits, clears"*) to settle for 2 seconds, then slowly begin scrolling down.
* **Spoken Script:**
  > "Every modern city has thousands of surveillance cameras. Yet, none of them prevent urban waste. Why? Because cameras are entirely passive—by the time a municipal worker reviews footage days later, a quiet storm drain or residential alleyway has already decayed into an illegal garbage blackspot. 
  > 
  > Today, we’re presenting **CivicClean**—an autonomous multimodal vision AI platform that turns passive municipal CCTV into real-time civic defense."

---

### [0:15 – 0:32] Chapter 01: The Urban Blind Spot & Kinematic Separation
* **Visual Action:** Scroll down into **Chapter 01: The Urban Blind Spot**. Hover cursor over the interactive Bento card showing the Particle Visualization and the 99.8% precision stat.
* **Spoken Script:**
  > "Traditional computer vision models fail in municipal environments because static object detection only spots trash in isolation. It cannot distinguish between a citizen carrying groceries versus an offender dumping industrial debris.
  >
  > CivicClean solves this through continuous kinematic tracking. Our pipeline isolates the exact split-second of **physical separation**—verifying the moment an object leaves a person or vehicle's custody and establishing intentional abandonment."

---

### [0:32 – 0:52] Chapter 05: Real-World Municipal Law & Non-Biometric Architecture
* **Visual Action:** Scroll smoothly down into **Chapter 05: Legal Compliance & Privacy Architecture**. Pause on the 3-column framework and the large *"0 Facial Recognition Models Used"* counter.
* **Spoken Script:**
  > "Now, a crucial legal question: **Why don't we use facial recognition?**
  >
  > In real-world municipal law, mass automated biometric facial recognition on public streets is legally banned or severely restricted under the **EU AI Act**, **NYC Biometric Laws**, and the **UK GDPR** due to civil liberties and massive 60%+ false-positive rates on low-resolution 30-foot CCTV.
  >
  > CivicClean is intentionally engineered as an **evidence triage platform, not a dystopian facial scanner**:
  > 1. **For Vehicles and Illegal Dumping:** Over 70% of municipal waste volume involves pickup trucks or commercial haulers. We utilize **Automated License Plate Recognition (ALPR)**—the legally established, court-tested precedent worldwide, from NYC Sanitation to Singapore's NEA.
  > 2. **For Pedestrian Littering:** We trigger rapid-dispatch alerts to sworn **on-foot ward marshals** stationed in the sector, equipping them with an immutable 3-frame dossier for in-person due-process enforcement.
  > 3. **Privacy-First:** All evidence stays strictly air-gapped on municipal cloud infrastructure with zero civilian facial indexing."

---

### [0:52 – 1:00] Chapter 03 & Transition to Console
* **Visual Action:** Scroll down through Chapter 03 (AWS Cloud Stack) and click the primary CTA button: **[ Launch Video Intake Demo ]**.
* **Spoken Script:**
  > "Our edge nodes scrub frames locally, and the AWS Cloud anchors the immutable judicial evidence. Let’s jump directly into the live operational console."

---

## Part 2: Live Operational Demo (1:00 – 2:15)

### [1:00 – 1:20] Live Video Intake & Animated Theme Toggler
* **Visual Action:** Arrive at `/intake`. Click the top-right **Theme Toggle icon** twice, showing the circular Magic UI transition smoothly switching between Dark Mode and Light Mode. Then drag-and-drop or select a sample violation video (or click sample preset).
* **Spoken Script:**
  > "Welcome to the CivicClean Operations Console. Designed for municipal command centers operating 24/7, we’ve implemented a zero-flicker circular theme toggler for day and night officer shifts.
  >
  > In the Video Intake module, municipal RTSP camera feeds, dashcams, or webhook payloads are ingested. As video feeds process, our temporal pipeline detects actors, tracks kinematics, and extracts candidates in sub-500 milliseconds."

---

### [1:20 – 1:45] Review Queue & 3-Frame Evidentiary Triage
* **Visual Action:** Click the **Review Queue** tab. Point to the pending violation card. Click the card to open its detailed inspection panel. Highlight the 3 forensic snapshots: **Before**, **Separation**, and **After**.
* **Spoken Script:**
  > "Here in the Officer Review Queue, AI never issues automated citations on its own—it serves as a copilot for sworn municipal compliance officers.
  >
  > Notice the three temporal milestones:
  > - **Frame 1 (Before):** Pre-drop context establishing the person carrying or transporting the item.
  > - **Frame 2 (Separation):** The exact frame of physical release and deposition onto the public ground.
  > - **Frame 3 (After):** Post-abandonment confirmation showing the offender departing the scene.
  >
  > Every frame includes verified millisecond timestamps and bounding box coordinates."

---

### [1:45 – 2:15] Officer Adjudication & Official Municipal Case Dossier
* **Visual Action:** Click the green **[ Approve Violation ]** button. Point to the newly appeared certified green banner: *"Case Certified by Municipal Compliance Officer — Evidentiary Chain-of-Custody Established"*. Click **[ View & Print Municipal Case Dossier ]**. Scroll through the authentic paper document and click **[ Print / Save Official PDF ]** (show the A4 print dialog preview briefly).
* **Spoken Script:**
  > "When the compliance officer clicks **Approve Violation**, CivicClean doesn't dump confusing raw JSON on government officials. Instead, it instantly compiles an official **Municipal Evidentiary Case Dossier** (Case Reference `CC-ENV-X892`).
  >
  > This is a complete, court-ready and dispatch-ready legal instrument:
  > - It logs sensor GPS telemetry, ward geofencing, and camera identifiers.
  > - It binds **Exhibits A, B, and C** with chain-of-custody timestamps.
  > - It includes an automated temporal state-transition audit.
  > - It provides municipal routing dispositions: issuing an ALPR summons for vehicles, dispatching on-foot sector marshals, or routing sanitation cleanup crews.
  > - And it signs the document with a sworn officer attestation and an unalterable **SHA-256 cryptographic seal**. Clicking Print formats directly into an official government citation."

---

## Part 3: AWS Cloud Architecture & Engineering Rationale (2:15 – 3:00)

### [2:15 – 2:55] Deep Dive into AWS Services & Architectural Choices
* **Visual Action:** Switch tab to the Architecture diagram or scroll to the **AWS Cloud Architecture Stack** cards on the landing page, highlighting each service badge.
* **Spoken Script:**
  > "To deploy CivicClean across city-scale camera networks, we engineered a dedicated **AWS Cloud Architecture**. Here is why we selected each AWS service:
  >
  > 1. **Amazon SageMaker Serverless Inference:** We host fine-tuned YOLOv8 waste detectors and ByteTrack spatial kinematics on SageMaker Serverless endpoints. *The Reasoning:* Municipal video feeds experience extreme spikes during morning rush hours and lull periods at 3 AM. SageMaker auto-scales to zero when idle, saving municipalities over 65% in cloud compute while maintaining sub-450 millisecond p99 inference.
  > 2. **Amazon S3 with Object Lock:** All video candidate clips and 3-frame evidentiary bundles are stored in Amazon S3 configured with WORM (Write Once, Read Many) Object Lock. *The Reasoning:* In environmental court trials, evidence must prove an unbroken chain of custody. S3 Object Lock prevents any modification or tampering by bad actors.
  > 3. **AWS Lambda & Amazon ECS (Fargate):** Video chunk uploads trigger serverless Lambda functions that orchestrate OpenCV frame extraction and forward candidate clips without managing dedicated EC2 servers.
  > 4. **Amazon DynamoDB:** We use DynamoDB for our violation ledger and kinematic state machine (Carrying → Separation → Stationarity). *The Reasoning:* DynamoDB provides single-digit millisecond latency partitioned by municipal ward, enabling real-time status polling for field officers.
  > 5. **Amazon SNS & SQS:** An asynchronous pub/sub messaging bus pushes sector alerts to on-foot ward marshals and distributes sanitation work orders.
  > 6. **AWS KMS (Key Management Service):** Generates and verifies the cryptographic SHA-256 digital seals stamped onto every approved Municipal Case Dossier."

---

### [2:55 – 3:00] Closing Callout
* **Visual Action:** Return to the full landing page view showing the CivicClean logo, with the tagline visible.
* **Spoken Script:**
  > "CivicClean transforms passive city cameras into proactive, constitutional, and privacy-preserving environmental defense—cleaning our cities faster, with zero dystopian surveillance. Thank you."

---

## Speaker Quick-Reference Checklist
- [ ] **First 60s strictly on Landing Page:** Establish problem $\rightarrow$ separation kinematics breakthrough $\rightarrow$ address legal facial recognition prohibition $\rightarrow$ ALPR + ward marshals.
- [ ] **Demonstrate Light/Dark Mode:** Toggle using the animated Magic UI button on the top-right header in the operational console.
- [ ] **Show Case Dossier:** Emphasize that government authorities get an official printable legal dossier (`CC-ENV-X892`) rather than raw JSON.
- [ ] **Explain AWS Services:** Explicitly mention **Amazon SageMaker, Amazon S3 Object Lock, AWS Lambda, Amazon DynamoDB, Amazon SNS/SQS, and AWS KMS**, along with the architectural reasoning for each.
