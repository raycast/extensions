npm install --save-dev @types/react@19.0.10 @types/node@22.13.10 --force

# Check if react-devtools is installed and update it if present
$npmList = npm list react-devtools 2>&1
if ($npmList -notmatch "empty" -and $LASTEXITCODE -eq 0) {
    npm install --save-dev react-devtools --force
}
