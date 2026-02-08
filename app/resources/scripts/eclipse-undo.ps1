# ECLIPSE UNDO SCRIPT - Version 6.0
# Executed at the end of the Moonlight stream
#
# LOGIQUE SIMPLE:
# 1. Lire l'etat initial sauvegarde par DO
# 2. Reactiver les ecrans desactives (mode focus)
# 3. Restaurer les resolutions initiales de TOUS les ecrans
# 4. Restaurer l'ecran principal (seulement si mode enable-primary ou focus)
# 5. Eteindre le VDD s'il etait eteint avant
# 6. Supprimer le fichier d'etat
#
# Le fichier d'etat contient:
# - vddWasEnabled: bool
# - initialPrimary: string (nom de l'ecran)
# - initialDisplays: dict { nom: { width, height, frequency, primary } }
# - disabledDisplays: array (ecrans desactives en mode focus)
# - displayMode: string (enable, enable-primary, focus)

$ErrorActionPreference = "Continue"
$LogFile = "$env:TEMP\eclipse_undo.log"
$StateFile = "$env:TEMP\eclipse_state.json"
$EclipseDir = "$env:APPDATA\Eclipse"
$ConfigFile = "$EclipseDir\eclipse-config.json"

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}

Log "=========================================="
Log "Eclipse UNDO Script v6.0 Started"
Log "=========================================="

try {
    # ============================================
    # 1. CHARGER L'ETAT INITIAL SAUVEGARDE PAR DO
    # ============================================
    if (-not (Test-Path $StateFile)) {
        Log "No saved state found, nothing to restore"
        exit 0
    }

    $state = Get-Content $StateFile -Raw | ConvertFrom-Json
    Log "State loaded from: $StateFile"
    Log "  Timestamp: $($state.timestamp)"
    Log "  VDD was enabled before: $($state.vddWasEnabled)"
    Log "  Initial primary: $($state.initialPrimary)"
    Log "  Display mode: $($state.displayMode)"

    if ($state.disabledDisplays -and $state.disabledDisplays.Count -gt 0) {
        Log "  Disabled displays: $($state.disabledDisplays -join ', ')"
    }

    # ============================================
    # 2. CHARGER LA CONFIG ECLIPSE
    # ============================================
    if (-not (Test-Path $ConfigFile)) {
        Log "Eclipse config not found: $ConfigFile"
        exit 0
    }

    $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    $devconPath = $config.devconPath
    $mmtPath = $config.multiMonitorToolPath
    $vddInstanceId = $config.vddInstanceId

    Log "Eclipse config loaded"
    Log "  devcon: $devconPath"
    Log "  MMT: $mmtPath"

    # ============================================
    # 3. REACTIVER LES ECRANS DESACTIVES (mode focus)
    # ============================================
    if ($state.disabledDisplays -and $state.disabledDisplays.Count -gt 0 -and (Test-Path $mmtPath)) {
        Log "Re-enabling displays disabled by focus mode..."
        foreach ($display in $state.disabledDisplays) {
            Log "  Enabling $display"
            & $mmtPath /enable $display 2>&1 | Out-Null
            Start-Sleep -Milliseconds 300
        }
        Start-Sleep -Seconds 1
        Log "Displays re-enabled"
    }

    # ============================================
    # 4. RESTAURER LES RESOLUTIONS INITIALES
    # ============================================
    if ($state.initialDisplays -and (Test-Path $mmtPath)) {
        Log "Restoring initial resolutions..."

        # Convert PSObject to hashtable for iteration
        $displaysHash = @{}
        $state.initialDisplays.PSObject.Properties | ForEach-Object {
            $displaysHash[$_.Name] = $_.Value
        }

        foreach ($displayName in $displaysHash.Keys) {
            $displayInfo = $displaysHash[$displayName]
            $w = $displayInfo.width
            $h = $displayInfo.height
            $f = $displayInfo.frequency

            if ($w -and $h -and $f) {
                Log "  $displayName : ${w}x${h}@${f}Hz"
                $monitorConfig = "Name=$displayName Width=$w Height=$h DisplayFrequency=$f"
                & $mmtPath /SetMonitors $monitorConfig 2>&1 | Out-Null
                Start-Sleep -Milliseconds 300
            }
        }
        Log "Resolutions restored"
    }

    # ============================================
    # 5. RESTAURER L'ECRAN PRINCIPAL (si necessaire)
    # ============================================
    # On ne restaure le primary que si le mode l'a explicitement change
    $shouldRestorePrimary = ($state.displayMode -eq "enable-primary") -or ($state.displayMode -eq "focus")

    if ($shouldRestorePrimary -and $state.initialPrimary -and (Test-Path $mmtPath)) {
        Log "Restoring primary display: $($state.initialPrimary) (mode was: $($state.displayMode))"
        & $mmtPath /SetPrimary $($state.initialPrimary) 2>&1 | Out-Null
        Start-Sleep -Milliseconds 500
        Log "Primary display restored"
    } elseif (-not $shouldRestorePrimary) {
        Log "Skipping primary restore (mode was: $($state.displayMode))"
    }

    # ============================================
    # 6. ETEINDRE LE VDD (s'il etait eteint avant)
    # ============================================
    Log "Checking VDD status..."

    if ($vddInstanceId -and (Test-Path $devconPath)) {
        $currentStatus = & $devconPath status "@$vddInstanceId" 2>&1
        $vddIsCurrentlyEnabled = [bool]($currentStatus -match "Driver is running")
        Log "  VDD currently: $(if($vddIsCurrentlyEnabled){'ENABLED'}else{'DISABLED'})"
        Log "  VDD was before: $(if($state.vddWasEnabled){'ENABLED'}else{'DISABLED'})"

        # Disable VDD only if:
        # 1. It was OFF before the stream (we turned it ON)
        # 2. It's currently ON
        if ((-not $state.vddWasEnabled) -and $vddIsCurrentlyEnabled) {
            Log "Disabling VDD (we had enabled it)..."
            & $devconPath disable "@$vddInstanceId" 2>&1 | Out-Null
            Log "VDD disabled"
        } elseif ($state.vddWasEnabled) {
            Log "VDD was already on before stream, leaving it on"
        } else {
            Log "VDD is already off"
        }
    } else {
        Log "Cannot check VDD - missing devcon or instance ID"
    }

    # ============================================
    # 7. SUPPRIMER LE FICHIER D'ETAT
    # ============================================
    Remove-Item $StateFile -ErrorAction SilentlyContinue
    Log "State file deleted"

} catch {
    Log "ERROR: $_"
    Log "Stack: $($_.ScriptStackTrace)"
}

Log "=========================================="
Log "Eclipse UNDO Script v6.0 Finished"
Log "=========================================="

exit 0
