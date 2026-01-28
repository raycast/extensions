# Test script to verify Codex authentication
# Run this in PowerShell to check if Codex auth is set up correctly

Write-Host "=== Codex Auth Test ===" -ForegroundColor Cyan
Write-Host ""

# Check home directory
$homeDir = $env:USERPROFILE
Write-Host "Home directory: $homeDir" -ForegroundColor Gray

# Check for auth file
$authPath = "$homeDir\.codex\auth.json"

Write-Host ""
Write-Host "Checking: $authPath" -ForegroundColor Gray

if (Test-Path $authPath) {
    Write-Host "  File exists" -ForegroundColor Green
    
    try {
        $content = Get-Content $authPath -Raw | ConvertFrom-Json
        
        Write-Host "  Top-level fields: $($content.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
        
        # Check for tokens object (new format)
        if ($content.tokens) {
            Write-Host "  Found 'tokens' object" -ForegroundColor Green
            Write-Host "  Token fields: $($content.tokens.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
            
            if ($content.tokens.access_token) {
                $tokenLength = $content.tokens.access_token.Length
                Write-Host "  Has access_token (length: $tokenLength)" -ForegroundColor Green
                
                # Show first/last few chars of token for verification
                $tokenStart = $content.tokens.access_token.Substring(0, [Math]::Min(20, $tokenLength))
                $tokenEnd = $content.tokens.access_token.Substring([Math]::Max(0, $tokenLength - 10))
                Write-Host "    Token: $tokenStart...$tokenEnd" -ForegroundColor Gray
                
                Write-Host ""
                Write-Host "=== Summary ===" -ForegroundColor Cyan
                Write-Host "Authentication configured correctly!" -ForegroundColor Green
                Write-Host "The Raycast extension should work now." -ForegroundColor Green
            } else {
                Write-Host "  No access_token in tokens object" -ForegroundColor Red
            }
        }
        # Check for direct access_token (legacy format)
        elseif ($content.access_token) {
            Write-Host "  Found direct access_token (legacy format)" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== Summary ===" -ForegroundColor Cyan
            Write-Host "Authentication configured correctly!" -ForegroundColor Green
        }
        else {
            Write-Host "  No access_token found in either format" -ForegroundColor Red
            Write-Host ""
            Write-Host "=== Summary ===" -ForegroundColor Cyan
            Write-Host "Authentication not found." -ForegroundColor Red
            Write-Host "Run 'codex login' to authenticate." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Error reading file: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  File not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Cyan
    Write-Host "Auth file not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix:" -ForegroundColor Yellow
    Write-Host "1. Run: npm install -g @openai/codex" -ForegroundColor White
    Write-Host "2. Run: codex login" -ForegroundColor White
    Write-Host "3. Complete the browser authentication" -ForegroundColor White
}

Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
