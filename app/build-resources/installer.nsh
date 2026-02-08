; Eclipse NSIS Custom Scripts
; VDD driver is installed at runtime by the app, NOT during installation
; This avoids duplicate drivers and ensures the app controls its own driver lifecycle

; === REMOVE VDD DRIVER BEFORE FILES ARE DELETED ===
; customRemoveFiles runs BEFORE the app files are deleted
; This is critical because we need devcon.exe to still exist to remove the driver
!macro customRemoveFiles
  DetailPrint "=== PRE-UNINSTALL: Removing VDD Driver ==="
  DetailPrint "Install dir: $INSTDIR"
  
  ; electron-builder extraResources puts files in resources/resources/...
  ; Check if devcon.exe exists
  IfFileExists "$INSTDIR\resources\resources\tools\VDD\devcon.exe" 0 VDDPreUninstallNotFound
  
  ; Remove the VDD driver using cmd.exe /C for reliable execution
  ; Syntax: devcon.exe remove <inf_path> <hardware_id> (same as install)
  DetailPrint "Running: devcon.exe remove MttVDD.inf Root\MttVDD"
  ExecWait 'cmd.exe /C ""$INSTDIR\resources\resources\tools\VDD\devcon.exe" remove "$INSTDIR\resources\resources\tools\VDD\MttVDD.inf" Root\MttVDD"' $0
  
  DetailPrint "VDD removal exit code: $0"
  Goto VDDPreUninstallDone
  
VDDPreUninstallNotFound:
  DetailPrint "devcon.exe not found at $INSTDIR\resources\resources\tools\VDD - skipping VDD removal"
  
VDDPreUninstallDone:
  DetailPrint "=== PRE-UNINSTALL: VDD cleanup completed ==="
!macroend

!macro customInstall
  ; Bug Fix 1 & 2: Install Sunshine dependencies (firewall rules + ViGEmBus)
  ; These scripts are bundled with Sunshine portable but never executed
  
  Var /GLOBAL SUNSHINE_SCRIPTS_PATH
  ; electron-builder extraResources puts files in resources/resources/...
  StrCpy $SUNSHINE_SCRIPTS_PATH "$INSTDIR\resources\resources\tools\Sunshine\scripts"
  
  ; === Bug Fix 1: Add Windows Firewall rules for Sunshine ===
  ; Without this, Moonlight cannot discover or connect to the PC
  DetailPrint "Adding Windows Firewall rules for Sunshine..."
  
  IfFileExists "$SUNSHINE_SCRIPTS_PATH\add-firewall-rule.bat" 0 FirewallScriptNotFound
  
  nsExec::ExecToLog '"$SUNSHINE_SCRIPTS_PATH\add-firewall-rule.bat"'
  Pop $0
  DetailPrint "Firewall rules added (exit code: $0)"
  Goto FirewallDone
  
FirewallScriptNotFound:
  DetailPrint "Warning: add-firewall-rule.bat not found at $SUNSHINE_SCRIPTS_PATH"
  
FirewallDone:

  ; === Bug Fix 2: Install ViGEmBus for gamepad support ===
  ; Without this, gamepads won't work in Sunshine streaming
  DetailPrint "Installing ViGEmBus for gamepad support..."
  
  IfFileExists "$SUNSHINE_SCRIPTS_PATH\vigembus_installer.exe" 0 ViGEmNotFound
  
  ; Run ViGEmBus installer silently (/passive = no UI, /norestart = don't restart)
  ; Use ExecWait instead of nsExec because ViGEmBus installer needs proper elevation
  DetailPrint "Running ViGEmBus installer..."
  ExecWait '"$SUNSHINE_SCRIPTS_PATH\vigembus_installer.exe" /passive /norestart' $0
  DetailPrint "ViGEmBus installation completed (exit code: $0)"
  Goto ViGEmDone
  
ViGEmNotFound:
  DetailPrint "Warning: vigembus_installer.exe not found at $SUNSHINE_SCRIPTS_PATH"
  
ViGEmDone:
  DetailPrint "Sunshine dependencies installation completed"
!macroend

!macro customUnInstall
  ; Clean uninstall - Remove Eclipse components while PRESERVING user data
  ; User data (presets, credentials) is kept for future reinstallation
  ; This matches behavior of VS Code, Slack, Discord, etc.

  ; === Force user context for $APPDATA ===
  ; In perMachine mode, $APPDATA points to C:\ProgramData instead of user's Roaming folder
  SetShellVarContext current

  ; === Change working directory to avoid folder lock ===
  ; Windows cannot delete a folder that is the "current working directory"
  SetOutPath "$TEMP"

  ; === FORCE KILL ECLIPSE AND SUNSHINE PROCESSES ===
  DetailPrint "Stopping Eclipse and Sunshine processes..."
  nsExec::ExecToLog 'taskkill /F /IM "Eclipse.exe" /T'
  Pop $0
  nsExec::ExecToLog 'taskkill /F /IM "sunshine.exe" /T'
  Pop $0
  Sleep 2000
  DetailPrint "Processes terminated"

  ; === Remove Windows Firewall rules ===
  DetailPrint "Removing Windows Firewall rules..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Eclipse Sunshine"'
  Pop $0

  ; === VDD driver removal handled in customRemoveFiles (runs BEFORE file deletion) ===

  ; === Clean VDD system folders ===
  DetailPrint "Removing VDD system folders..."
  RMDir /r "C:\VDD"
  RMDir /r "C:\VirtualDisplayDriver"

  ; === Clean ONLY regenerable cache folders ===
  ; User data (credentials, presets, Local Storage) is PRESERVED
  DetailPrint "Removing cache files (user data preserved)..."
  RMDir /r "$APPDATA\eclipse\GPUCache"
  RMDir /r "$APPDATA\eclipse\GPU Cache"
  RMDir /r "$APPDATA\eclipse\Code Cache"
  RMDir /r "$APPDATA\eclipse\Cache"
  RMDir /r "$APPDATA\eclipse\blob_storage"
  RMDir /r "$APPDATA\eclipse\DawnGraphiteCache"
  RMDir /r "$APPDATA\eclipse\DawnWebGPUCache"
  RMDir /r "$APPDATA\eclipse\Session Storage"
  RMDir /r "$APPDATA\eclipse\Network"
  RMDir /r "$APPDATA\eclipse\Shared Storage"
  RMDir /r "$APPDATA\eclipse\Share Dictionary"
  RMDir /r "$APPDATA\eclipse\Shared Dictionary"
  Delete "$APPDATA\eclipse\Preferences"
  Delete "$APPDATA\eclipse\Local State"
  DetailPrint "Cache cleaned, user data preserved in %APPDATA%\\eclipse"

  ; === Remove installation folder ===
  RMDir /r "$INSTDIR"
  DetailPrint "Uninstallation completed"
!macroend
