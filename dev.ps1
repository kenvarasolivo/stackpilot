# Starts both StackPilot servers in separate PowerShell windows.
# Prereqs: see README.md (pip install + npm install + .env configured).

$root = $PSScriptRoot

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\backend'; if (Test-Path .venv) { .\.venv\Scripts\Activate.ps1 }; uvicorn main:app --reload --port 8000"
)

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\frontend'; npm run dev"
)

Write-Host "Backend  -> http://localhost:8000 (docs at /docs)"
Write-Host "Frontend -> http://localhost:3000"
