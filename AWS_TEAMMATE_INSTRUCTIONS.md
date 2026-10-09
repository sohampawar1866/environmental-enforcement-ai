# AWS Deployment Guide for Teammate 🚀

> **Repository**: [sohampawar1866/environmental-enforcement-ai](https://github.com/sohampawar1866/environmental-enforcement-ai)  
> All code changes, Docker configurations, and S3 adapters are already committed and pushed to `main`.

---

## 📌 Checklist: What You Need To Do

### 1. Create the S3 Evidence Bucket
1. Open the **AWS S3 Console** $\rightarrow$ Click **Create bucket**.
2. **Bucket name**: `civicclean-evidence-vault` (or your unique name).
3. **Region**: `us-east-1` (or your chosen region).
4. **Block Public Access**: Leave **ON** (all public access blocked).  
   *Note: Our backend generates 2-hour pre-signed secure URLs for viewing videos and exhibits, so public access is not needed.*
5. Under the bucket's **Permissions** $\rightarrow$ **CORS**, paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedOrigins": ["*"]
     }
   ]
   ```

---

### 2. Create IAM Access Keys
1. Go to **IAM Console** $\rightarrow$ **Users** $\rightarrow$ **Create user** (e.g. `civicclean-app`).
2. Attach inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
         "Resource": [
           "arn:aws:s3:::civicclean-evidence-vault",
           "arn:aws:s3:::civicclean-evidence-vault/*"
         ]
       }
     ]
   }
   ```
3. Generate **Access Key** and copy:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

### 3. Deploy via AWS App Runner
1. Open **AWS App Runner Console** $\rightarrow$ **Create service**.
2. **Source**: Choose **Source code repository** $\rightarrow$ Link GitHub repo `sohampawar1866/environmental-enforcement-ai`.
3. **Branch**: `main`.
4. **Configuration**:
   - Build provider: **Dockerfile**
   - Port: `8000`
5. **Compute**: `1 vCPU / 2 GB` (or `2 vCPU / 4 GB`).
6. **Environment Variables**:
   ```env
   AWS_S3_BUCKET_NAME=civicclean-evidence-vault
   AWS_DEFAULT_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   BETTER_AUTH_SECRET=civicclean-production-secret-key-2026
   ```
7. Click **Deploy**. App Runner will provide your live HTTPS domain: `https://<id>.awsapprunner.com`.

---

### 4. Set Up CloudWatch Logs (Show Judges)
1. Go to **CloudWatch Console** $\rightarrow$ **Log groups** $\rightarrow$ `/aws/apprunner/civicclean-platform`.
2. App Runner automatically streams container logs.
3. In **Log Insights**, run this query to view live municipal dispatches:
   ```sql
   fields @timestamp, @message
   | filter @message like /\[CAD_ACTION\]/ or @message like /\[VIDEO_INGEST\]/
   | sort @timestamp desc
   ```
4. Pin this to a CloudWatch Dashboard for the video/slides.

---

## ❓ FAQ & Project Technical Truths

### Where is the YOLO model? Are we actually using one?
**Yes, 100%!**  
The model is at `models/baraa-best.pt` (39 MB). It is a fine-tuned YOLOv8 weights file trained on `person` and `trash/litter` objects. In `backend/app/vision/pipeline.py`, the backend runs frame-by-frame object detection, detachment trajectory analysis, and frame extraction directly using PyTorch and Ultralytics.

### Why aren't we running a live SageMaker real-time endpoint?
- A dedicated SageMaker real-time GPU endpoint (`ml.g4dn.xlarge`) costs **$0.70 to $1.20 per hour**, which would drain $50–$80 of the hackathon credit budget in just 3 days of idling.
- Instead, our Docker container runs the model directly inside the App Runner container at near-zero cost.
- **In our presentation/video**: We state that the architecture is designed with exportable ONNX/PyTorch artifacts ready for high-throughput Amazon SageMaker AI endpoints, while our edge demo runs containerized on AWS App Runner with S3 evidentiary vaults and CloudWatch telemetry.
