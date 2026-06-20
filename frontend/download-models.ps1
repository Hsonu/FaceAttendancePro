$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$outDir = "$PSScriptRoot\public\models"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

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

Write-Host "Downloading face-api.js model weights..." -ForegroundColor Cyan

foreach ($file in $models) {
    $url = "$baseUrl/$file"
    $dest = "$outDir\$file"
    Write-Host "  Downloading: $file" -ForegroundColor Gray
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    Write-Host "  Done: $file" -ForegroundColor Green
}

Write-Host ""
Write-Host "All face-api.js models downloaded successfully!" -ForegroundColor Green
Write-Host "Location: $outDir" -ForegroundColor Gray
