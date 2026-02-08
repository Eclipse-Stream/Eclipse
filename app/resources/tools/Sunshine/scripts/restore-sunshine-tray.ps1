# restore-sunshine-tray.ps1
# Story 9.6 AC5: Restaure le system tray Sunshine lors de la desinstallation d'Eclipse
# A integrer dans l'installeur (Epic 11)

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Chemins possibles pour sunshine.conf
$ConfigPaths = @(
    "$env:ProgramFiles\Sunshine\config\sunshine.conf",
    "${env:ProgramFiles(x86)}\Sunshine\config\sunshine.conf"
)

$ConfigPath = $null

# Trouver le fichier de configuration
foreach ($path in $ConfigPaths) {
    if (Test-Path $path) {
        $ConfigPath = $path
        break
    }
}

if (-not $ConfigPath) {
    Write-Host "sunshine.conf non trouve - rien a restaurer" -ForegroundColor Yellow
    exit 0
}

Write-Host "Configuration Sunshine trouvee: $ConfigPath" -ForegroundColor Cyan

try {
    # Lire le contenu actuel
    $content = Get-Content $ConfigPath -Raw -Encoding UTF8
    $lines = $content -split "`n"

    $modified = $false
    $newLines = @()

    foreach ($line in $lines) {
        $trimmed = $line.Trim()

        # Remplacer system_tray = disabled par enabled
        if ($trimmed -match "^system_tray\s*=") {
            if ($trimmed -match "disabled") {
                $newLines += "system_tray = enabled"
                $modified = $true
                Write-Host "Restauration: system_tray = enabled" -ForegroundColor Green
            } else {
                $newLines += $line
            }
        } else {
            $newLines += $line
        }
    }

    if ($modified) {
        # Ecrire le fichier modifie
        $newContent = $newLines -join "`n"
        Set-Content -Path $ConfigPath -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Configuration Sunshine restauree avec succes" -ForegroundColor Green

        # Optionnel: Redemarrer Sunshine pour appliquer
        if ($Force) {
            Write-Host "Redemarrage de Sunshine..." -ForegroundColor Cyan
            $sunshineProcess = Get-Process -Name "sunshine" -ErrorAction SilentlyContinue
            if ($sunshineProcess) {
                Stop-Process -Name "sunshine" -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                # Note: Le redemarrage depend de l'installation (service ou application)
                # L'installeur Epic 11 gerera cela
            }
        }
    } else {
        Write-Host "Aucune modification necessaire - system_tray deja configure correctement" -ForegroundColor Yellow
    }

} catch {
    Write-Host "Erreur lors de la restauration: $_" -ForegroundColor Red
    exit 1
}

exit 0
