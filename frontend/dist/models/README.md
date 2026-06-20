# Face-API.js Models

This folder must contain the face-api.js model weight files for face recognition to work.

## Required Model Files

Place the following files in this `/public/models/` directory:

```
models/
├── ssd_mobilenetv1_model-weights_manifest.json
├── ssd_mobilenetv1_model-shard1
├── ssd_mobilenetv1_model-shard2
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
└── face_recognition_model-shard2
```

## Download Instructions

### Option 1 — PowerShell Script (Windows)
Run from the `frontend/` directory:

```powershell
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$models = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)
foreach ($file in $models) {
    Invoke-WebRequest -Uri "$baseUrl/$file" -OutFile "public/models/$file"
    Write-Host "Downloaded: $file"
}
Write-Host "All models downloaded!"
```

### Option 2 — npm script
```bash
node scripts/download-models.js
```

## Notes
- Total size: ~6 MB
- Models run **100% in-browser** — no server calls, no API keys needed
- The models use `SsdMobilenetv1` for detection + `FaceLandmark68Net` + `FaceRecognitionNet` for recognition
