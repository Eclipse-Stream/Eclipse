# ECLIPSE DO SCRIPT - Version 7.1
# Executed when launching an Eclipse application from Moonlight
#
# LOGIQUE v7.1:
# 1. Sauvegarder l'etat initial IMMEDIATEMENT (avant tout changement)
# 2. Lire sunshine.conf DIRECTEMENT
# 3. Determiner ce qu'il faut faire:
#    - Si VDD + dd_resolution_option = disabled:
#      - Chercher les presets correspondants
#      - 0 preset → juste allumer VDD, garder sa derniere resolution
#      - 1 preset → utiliser ce preset (avec son preset screen)
#      - N presets → utiliser activePresetId si dans la liste
#    - Sinon appliquer la config (manual/moonlight)
# 4. Appliquer le mode d'affichage (focus, enable-primary, etc.)
#
# Le UNDO restaurera l'etat initial sauvegarde.

$ErrorActionPreference = "Continue"
$LogFile = "$env:TEMP\eclipse_do.log"
$StateFile = "$env:TEMP\eclipse_state.json"
$EclipseDir = "$env:APPDATA\Eclipse"
$ConfigFile = "$EclipseDir\eclipse-config.json"
$PresetsFile = "$EclipseDir\presets.json"
$ActivePresetFile = "$EclipseDir\active-preset.json"

# ============================================
# LOGGING
# ============================================
function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}

# ============================================
# HELPER FUNCTIONS
# ============================================

# Parse sunshine.conf (format: key = value)
function Parse-SunshineConf {
    param([string]$path)
    $config = @{}
    if (-not (Test-Path $path)) { return $config }

    foreach ($line in (Get-Content $path)) {
        $line = $line.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { continue }

        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $config[$key] = $value
        }
    }
    return $config
}

function Parse-MmtCsvLine {
    param([string]$line)
    if ($line -match "^Resolution,") { return $null }

    $parts = @()
    $inQuote = $false
    $current = ""
    for ($i = 0; $i -lt $line.Length; $i++) {
        $char = $line[$i]
        if ($char -eq '"') { $inQuote = -not $inQuote }
        elseif ($char -eq ',' -and -not $inQuote) { $parts += $current.Trim('"'); $current = "" }
        else { $current += $char }
    }
    $parts += $current.Trim('"')
    if ($parts.Count -lt 13) { return $null }

    $width = 0; $height = 0
    if ($parts[0] -match "(\d+)\s*[Xx]\s*(\d+)") { $width = [int]$Matches[1]; $height = [int]$Matches[2] }

    return @{
        name = $parts[12]
        width = $width
        height = $height
        frequency = if ($parts[7] -match "^\d+$") { [int]$parts[7] } else { 60 }
        primary = $parts[5] -eq "Yes"
        adapterName = if ($parts.Count -gt 13) { $parts[13] } else { "" }
        monitorId = if ($parts.Count -gt 16) { $parts[16] } else { "" }
    }
}

function Get-AllDisplays {
    param([string]$mmtPath)
    if (-not (Test-Path $mmtPath)) { return @() }

    $csvPath = "$env:TEMP\eclipse_displays.csv"
    & $mmtPath /scomma $csvPath 2>&1 | Out-Null
    Start-Sleep -Milliseconds 500

    $displays = @()
    if (Test-Path $csvPath) {
        foreach ($line in (Get-Content $csvPath)) {
            $parsed = Parse-MmtCsvLine -line $line
            if ($parsed) { $displays += $parsed }
        }
        Remove-Item $csvPath -ErrorAction SilentlyContinue
    }
    return $displays
}

function Find-VddDisplayNumber {
    param([string]$mmtPath)
    $displays = Get-AllDisplays -mmtPath $mmtPath
    foreach ($d in $displays) {
        if ($d.adapterName -imatch "mtt|virtual|indirect") { return $d.name }
    }
    foreach ($d in $displays) {
        if ($d.monitorId -imatch "mtt|vdd|virtual|indirect") { return $d.name }
    }
    return $null
}

function Find-DisplayByDeviceId {
    param([string]$mmtPath, [string]$targetDeviceId, [string]$sunshineLogPath)
    if (-not $targetDeviceId) { return $null }

    # Try Sunshine log mapping first
    if ($sunshineLogPath -and (Test-Path $sunshineLogPath)) {
        $logContent = Get-Content $sunshineLogPath -Raw -ErrorAction SilentlyContinue
        $pattern = '"device_id":\s*"(\{[^}]+\})",\s*\n\s*"display_name":\s*"([^"]+)"'
        $matches = [regex]::Matches($logContent, $pattern)
        foreach ($match in $matches) {
            if ($match.Groups[1].Value -eq $targetDeviceId) {
                return $match.Groups[2].Value -replace '\\\\', '\'
            }
        }
    }

    # Fallback to MMT
    $displays = Get-AllDisplays -mmtPath $mmtPath
    foreach ($d in $displays) {
        if ($d.monitorId -imatch [regex]::Escape($targetDeviceId)) { return $d.name }
    }
    return $null
}

function Get-PresetById {
    param([string]$presetId, [string]$presetsPath)
    if (-not (Test-Path $presetsPath)) { return $null }
    $presets = Get-Content $presetsPath -Raw | ConvertFrom-Json
    return $presets | Where-Object { $_.id -eq $presetId }
}

function Get-AllPresets {
    param([string]$presetsPath)
    if (-not (Test-Path $presetsPath)) { return @() }
    return Get-Content $presetsPath -Raw | ConvertFrom-Json
}

# Trouve tous les presets qui correspondent a la config Sunshine actuelle
# Retourne un tableau de presets
function Find-MatchingPresets {
    param(
        [object]$sunshineConfig,
        [array]$presets,
        [string]$vddDeviceId
    )

    $matching = @()
    $outputName = $sunshineConfig["output_name"]
    $ddConfigOption = $sunshineConfig["dd_configuration_option"]
    $ddResolutionOption = $sunshineConfig["dd_resolution_option"]
    $fps = $sunshineConfig["fps"]
    if (-not $fps) { $fps = $sunshineConfig["minimum_fps_target"] }
    $maxBitrate = $sunshineConfig["max_bitrate"]
    $upnp = $sunshineConfig["upnp"]

    foreach ($preset in $presets) {
        if (-not $preset.display) { continue }

        # Verifier si l'ecran correspond
        $deviceMatches = $false
        $presetDeviceId = $preset.display.deviceId

        if ($presetDeviceId -eq $outputName) {
            $deviceMatches = $true
        } elseif ($outputName -eq $vddDeviceId -and ($preset.display.screenId -eq "eclipse" -or $presetDeviceId -eq $vddDeviceId)) {
            $deviceMatches = $true
        }

        if (-not $deviceMatches) { continue }

        # Verifier les autres criteres (fps, bitrate, etc.)
        # On est tolerant ici - si les valeurs principales correspondent, c'est bon
        $fpsMatches = $true
        if ($preset.display.fps -and $fps) {
            $fpsMatches = ([int]$preset.display.fps -eq [int]$fps)
        }

        $bitrateMatches = $true
        if ($preset.display.bitrate -and $maxBitrate) {
            $bitrateMatches = ([int]$preset.display.bitrate -eq [int]$maxBitrate)
        }

        # Resolution strategy doit correspondre
        $resStrategyMatches = $true
        $presetResStrategy = $preset.display.resolutionStrategy
        if ($presetResStrategy -eq "moonlight" -and $ddResolutionOption -and $ddResolutionOption -ne "disabled") {
            # moonlight = pas de resolution manuelle
            $resStrategyMatches = ($ddResolutionOption -ne "manual")
        } elseif ($presetResStrategy -eq "manual" -and $ddResolutionOption) {
            $resStrategyMatches = ($ddResolutionOption -eq "manual")
        } elseif ($presetResStrategy -eq "disabled" -or $presetResStrategy -eq "none" -or $presetResStrategy -eq "keep") {
            $resStrategyMatches = ($ddResolutionOption -eq "disabled" -or -not $ddResolutionOption)
        }

        if ($deviceMatches -and $fpsMatches -and $bitrateMatches -and $resStrategyMatches) {
            $matching += $preset
        }
    }

    return $matching
}

# ============================================
# MAIN SCRIPT
# ============================================
Log "=========================================="
Log "Eclipse DO Script v7.1 Started"
Log "Moonlight: $env:SUNSHINE_CLIENT_WIDTH x $env:SUNSHINE_CLIENT_HEIGHT @ $env:SUNSHINE_CLIENT_FPS fps"
Log "=========================================="

try {
    # ============================================
    # 1. CHARGER LA CONFIG ECLIPSE
    # ============================================
    if (-not (Test-Path $ConfigFile)) {
        Log "ERROR: Eclipse config not found. Exiting."
        exit 0
    }

    $eclipseConfig = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    $devconPath = $eclipseConfig.devconPath
    $mmtPath = $eclipseConfig.multiMonitorToolPath
    $vddInstanceId = $eclipseConfig.vddInstanceId
    $vddDeviceId = $eclipseConfig.vddDeviceId
    $sunshineConfPath = Join-Path $eclipseConfig.toolsPath "Sunshine\config\sunshine.conf"
    $sunshineLogPath = Join-Path $eclipseConfig.toolsPath "Sunshine\config\sunshine.log"

    Log "Config: devcon=$devconPath, MMT=$mmtPath, VDD=$vddDeviceId"

    # ============================================
    # 2. SAUVEGARDER L'ETAT INITIAL (AVANT TOUT CHANGEMENT)
    # ============================================
    Log "--- SAVING INITIAL STATE ---"

    # VDD etait-il allume ?
    $vddWasEnabled = $false
    if ($vddInstanceId -and (Test-Path $devconPath)) {
        $status = & $devconPath status "@$vddInstanceId" 2>&1
        $vddWasEnabled = [bool]($status -match "Driver is running")
    }
    Log "  VDD was enabled: $vddWasEnabled"

    # Etat de tous les ecrans (primary, resolution)
    $displays = Get-AllDisplays -mmtPath $mmtPath
    $initialDisplays = @{}
    $initialPrimary = $null
    foreach ($d in $displays) {
        $initialDisplays[$d.name] = @{
            width = $d.width
            height = $d.height
            frequency = $d.frequency
            primary = $d.primary
        }
        if ($d.primary) { $initialPrimary = $d.name }
        Log "  $($d.name): $($d.width)x$($d.height)@$($d.frequency)Hz $(if($d.primary){'[PRIMARY]'}else{''})"
    }
    Log "  Primary display: $initialPrimary"

    # Sauvegarder dans le fichier d'etat
    $state = @{
        timestamp = (Get-Date).ToString("o")
        vddWasEnabled = $vddWasEnabled
        initialPrimary = $initialPrimary
        initialDisplays = $initialDisplays
        disabledDisplays = @()
        displayMode = "enable"
    }

    # ============================================
    # 3. LIRE SUNSHINE.CONF DIRECTEMENT
    # ============================================
    Log "--- READING SUNSHINE.CONF ---"

    $sunshineConfig = Parse-SunshineConf -path $sunshineConfPath

    $outputName = $sunshineConfig["output_name"]
    $ddConfigOption = $sunshineConfig["dd_configuration_option"]
    $ddResolutionOption = $sunshineConfig["dd_resolution_option"]
    $ddManualResolution = $sunshineConfig["dd_manual_resolution"]
    $ddManualRefreshRate = $sunshineConfig["dd_manual_refresh_rate"]

    Log "  output_name: $outputName"
    Log "  dd_configuration_option: $ddConfigOption"
    Log "  dd_resolution_option: $ddResolutionOption"
    Log "  dd_manual_resolution: $ddManualResolution"
    Log "  dd_manual_refresh_rate: $ddManualRefreshRate"

    # ============================================
    # 4. DETERMINER CE QU'IL FAUT FAIRE
    # ============================================
    Log "--- DETERMINING ACTIONS ---"

    $targetDeviceId = $outputName
    $needVdd = ($targetDeviceId -eq $vddDeviceId)
    $resolutionStrategy = "moonlight"
    $manualWidth = $null
    $manualHeight = $null
    $manualRefresh = 60
    $displayMode = "enable"
    $selectedPreset = $null

    Log "  Target device: $targetDeviceId"
    Log "  Need VDD: $needVdd"

    # Lire le preset actif
    $activePresetId = $null
    if (Test-Path $ActivePresetFile) {
        $data = Get-Content $ActivePresetFile -Raw | ConvertFrom-Json
        $activePresetId = $data.activePresetId
    }
    Log "  Active preset ID: $activePresetId"

    # CAS SPECIAL: VDD + dd_resolution_option = disabled (ne pas changer)
    # Il faut chercher le preset correspondant pour connaitre le preset screen
    if ($needVdd -and ($ddResolutionOption -eq "disabled" -or -not $ddResolutionOption -or $ddResolutionOption -eq "")) {
        Log "  VDD + 'ne pas changer' detecte, recherche de presets correspondants..."

        $allPresets = Get-AllPresets -presetsPath $PresetsFile
        $matchingPresets = Find-MatchingPresets -sunshineConfig $sunshineConfig -presets $allPresets -vddDeviceId $vddDeviceId

        Log "  Presets correspondants trouves: $($matchingPresets.Count)"

        if ($matchingPresets.Count -eq 0) {
            # Aucun preset ne correspond -> juste allumer VDD, garder sa resolution
            Log "  Aucun preset correspondant, VDD gardera sa derniere resolution"
            $resolutionStrategy = "keep"
        } elseif ($matchingPresets.Count -eq 1) {
            # Un seul preset correspond -> l'utiliser
            $selectedPreset = $matchingPresets[0]
            Log "  Un seul preset correspond: $($selectedPreset.name)"
        } else {
            # Plusieurs presets correspondent -> prendre le plus recent (activePresetId si dans la liste)
            Log "  Plusieurs presets correspondent, recherche du plus recent..."

            $found = $false
            foreach ($p in $matchingPresets) {
                if ($p.id -eq $activePresetId) {
                    $selectedPreset = $p
                    $found = $true
                    Log "  Preset actif trouve dans la liste: $($p.name)"
                    break
                }
            }

            if (-not $found) {
                # Prendre le premier
                $selectedPreset = $matchingPresets[0]
                Log "  Preset actif non dans la liste, utilise le premier: $($selectedPreset.name)"
            }
        }

        # Si on a trouve un preset, utiliser ses parametres
        if ($selectedPreset) {
            $displayMode = if ($selectedPreset.display.mode) { $selectedPreset.display.mode } else { "enable" }

            # Utiliser le preset screen du preset (resolution a la creation du VDD)
            if ($selectedPreset.display.presetScreen) {
                $presetScreen = $selectedPreset.display.presetScreen
                if ($presetScreen.width -and $presetScreen.height) {
                    $resolutionStrategy = "preset"
                    $manualWidth = [int]$presetScreen.width
                    $manualHeight = [int]$presetScreen.height
                    $manualRefresh = if ($presetScreen.refreshRate) { [int]$presetScreen.refreshRate } else { 60 }
                    Log "  Resolution from preset screen: $manualWidth x $manualHeight @ $manualRefresh Hz"
                }
            } elseif ($selectedPreset.display.manualResolution) {
                # Fallback sur manualResolution si pas de presetScreen
                $resolutionStrategy = "preset"
                $manualWidth = [int]$selectedPreset.display.manualResolution.width
                $manualHeight = [int]$selectedPreset.display.manualResolution.height
                $manualRefresh = if ($selectedPreset.display.manualRefreshRate) { [int]$selectedPreset.display.manualRefreshRate } else { 60 }
                Log "  Resolution from manual preset: $manualWidth x $manualHeight @ $manualRefresh Hz"
            }

            Log "  Display mode from preset: $displayMode"
        }
    }
    # CAS NORMAL: Resolution manuelle ou moonlight
    elseif ($ddResolutionOption -eq "manual" -and $ddManualResolution) {
        $resolutionStrategy = "manual"
        if ($ddManualResolution -match "(\d+)x(\d+)") {
            $manualWidth = [int]$Matches[1]
            $manualHeight = [int]$Matches[2]
        }
        if ($ddManualRefreshRate) {
            $manualRefresh = [int]$ddManualRefreshRate
        }
        Log "  Resolution: MANUAL from config ($manualWidth x $manualHeight @ $manualRefresh Hz)"

        # Chercher le preset pour le mode d'affichage
        if ($activePresetId) {
            $preset = Get-PresetById -presetId $activePresetId -presetsPath $PresetsFile
            if ($preset -and $preset.display) {
                $presetDeviceId = $preset.display.deviceId
                if ($presetDeviceId -eq $targetDeviceId -or ($needVdd -and ($preset.display.screenId -eq "eclipse" -or $presetDeviceId -eq $vddDeviceId))) {
                    $displayMode = if ($preset.display.mode) { $preset.display.mode } else { "enable" }
                    Log "  Display mode from preset: $displayMode"
                }
            }
        }
    }
    else {
        Log "  Resolution: MOONLIGHT (from client)"

        # Chercher le preset pour le mode d'affichage
        if ($activePresetId) {
            $preset = Get-PresetById -presetId $activePresetId -presetsPath $PresetsFile
            if ($preset -and $preset.display) {
                $presetDeviceId = $preset.display.deviceId
                if ($presetDeviceId -eq $targetDeviceId -or ($needVdd -and ($preset.display.screenId -eq "eclipse" -or $presetDeviceId -eq $vddDeviceId))) {
                    $displayMode = if ($preset.display.mode) { $preset.display.mode } else { "enable" }
                    Log "  Display mode from preset: $displayMode"
                }
            }
        }
    }

    Log "  Final resolution strategy: $resolutionStrategy"
    Log "  Final display mode: $displayMode"

    # ============================================
    # 5. APPLIQUER LES CHANGEMENTS
    # ============================================
    Log "--- APPLYING CHANGES ---"

    # 5a. Allumer le VDD si necessaire
    if ($needVdd -and -not $vddWasEnabled) {
        Log "Enabling VDD..."
        & $devconPath enable "@$vddInstanceId" 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        Log "VDD enabled"
        
        # Bug Fix: Force le mode "Etendre" au lieu de "Dupliquer"
        # Windows met parfois les nouveaux ecrans en mode dupliquer par defaut
        Log "Forcing Extend mode (not Duplicate)..."
        Start-Process -FilePath "DisplaySwitch.exe" -ArgumentList "/extend" -Wait -NoNewWindow -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }

    # 5b. Trouver l'ecran cible
    $targetDisplay = $null
    if ($needVdd) {
        $targetDisplay = Find-VddDisplayNumber -mmtPath $mmtPath
        Log "VDD display: $targetDisplay"
    } elseif ($targetDeviceId) {
        $targetDisplay = Find-DisplayByDeviceId -mmtPath $mmtPath -targetDeviceId $targetDeviceId -sunshineLogPath $sunshineLogPath
        Log "Real screen: $targetDisplay"
    }

    if (-not $targetDisplay) {
        Log "WARNING: No target display found"
    } else {
        # 5c. Determiner la resolution cible
        $targetWidth = $null
        $targetHeight = $null
        $targetRefresh = 60

        if ($resolutionStrategy -eq "keep") {
            # Ne pas changer la resolution - ne rien faire
            Log "Keeping current VDD resolution (no change)"
        } elseif ($resolutionStrategy -eq "manual" -or $resolutionStrategy -eq "preset") {
            $targetWidth = $manualWidth
            $targetHeight = $manualHeight
            $targetRefresh = $manualRefresh
        } else {
            # moonlight
            $targetWidth = $env:SUNSHINE_CLIENT_WIDTH
            $targetHeight = $env:SUNSHINE_CLIENT_HEIGHT
            $targetRefresh = if ($env:SUNSHINE_CLIENT_FPS) { [int]$env:SUNSHINE_CLIENT_FPS } else { 60 }
        }

        # 5d. Appliquer la resolution (sauf si "keep")
        if ($resolutionStrategy -ne "keep" -and $targetWidth -and $targetHeight) {
            Log "Target resolution: $targetWidth x $targetHeight @ $targetRefresh Hz"
            $monitorConfig = "Name=$targetDisplay Width=$targetWidth Height=$targetHeight DisplayFrequency=$targetRefresh"
            Log "Applying: $monitorConfig"
            & $mmtPath /SetMonitors $monitorConfig 2>&1 | Out-Null
            Start-Sleep -Milliseconds 500
        }

        # 5e. Appliquer le mode d'affichage
        switch ($displayMode) {
            "enable-primary" {
                Log "Setting $targetDisplay as primary"
                & $mmtPath /SetPrimary $targetDisplay 2>&1 | Out-Null
            }
            "focus" {
                Log "Focus mode: disabling other displays"
                $disabledList = @()
                $currentDisplays = Get-AllDisplays -mmtPath $mmtPath
                foreach ($d in $currentDisplays) {
                    if ($d.name -ne $targetDisplay) {
                        Log "  Disabling $($d.name)"
                        & $mmtPath /disable $($d.name) 2>&1 | Out-Null
                        $disabledList += $d.name
                        Start-Sleep -Milliseconds 300
                    }
                }
                $state.disabledDisplays = $disabledList
                Log "Setting $targetDisplay as primary"
                & $mmtPath /SetPrimary $targetDisplay 2>&1 | Out-Null
            }
            default {
                Log "Mode: $displayMode (no additional action)"
            }
        }
    }

    # ============================================
    # 6. SAUVEGARDER L'ETAT POUR UNDO
    # ============================================
    $state.displayMode = $displayMode
    $json = $state | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($StateFile, $json)
    Log "State saved: $StateFile"

} catch {
    Log "ERROR: $_"
    Log "Stack: $($_.ScriptStackTrace)"
}

Log "=========================================="
Log "Eclipse DO Script v7.1 Finished"
Log "=========================================="
exit 0
