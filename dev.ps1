# Starts both StackPilot servers in separate PowerShell windows.
# Prereqs: see README.md (pip install + npm install + .env configured).

$root = $PSScriptRoot

Start-Process powershell -ArgumentList @(
  "-NoExit", "-ExecutionPolicy", "Bypass", "-Command",
  "cd '$root\backend'; if (Test-Path .venv\Scripts\python.exe) { & .\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000 } else { Write-Host 'No .venv found - see README: python -m venv .venv; pip install -r requirements.txt' -ForegroundColor Red }"
)

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\frontend'; npm run dev"
)

Write-Host "Backend  -> http://localhost:8000 (docs at /docs)"
Write-Host "Frontend -> http://localhost:3000"
