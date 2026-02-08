import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@ui/layouts';
import { useAppStore, useSunshinePresetStore, useSettingsStore } from '@application/stores';
import { SetupCredentialsDialog, SunshineMissingDialog } from '@ui/components/features';
import { LanguageDialog, SunshineNameDialog, WelcomeDialog } from '@ui/components/features/Onboarding';

function App() {
  const { i18n } = useTranslation();
  const currentPage = useAppStore((state) => state.currentPage);
  const setPage = useAppStore((state) => state.setPage);
  const checkCredentials = useAppStore((state) => state.checkCredentials);
  const checkSunshineHealth = useAppStore((state) => state.checkSunshineHealth);
  const sunshineInstalled = useAppStore((state) => state.sunshineInstalled);
  const sunshineHealthResult = useAppStore((state) => state.sunshineHealthResult);
  const hasCredentials = useAppStore((state) => state.hasCredentials);

  // Settings store (language, sunshineName, onboarding)
  const language = useSettingsStore((state) => state.language);
  const sunshineName = useSettingsStore((state) => state.sunshineName);
  const setSunshineName = useSettingsStore((state) => state.setSunshineName);
  const onboardingCompleted = useSettingsStore((state) => state.onboardingCompleted);
  const setOnboardingCompleted = useSettingsStore((state) => state.setOnboardingCompleted);

  // Sunshine preset sync
  const detectAndSyncActivePreset = useSunshinePresetStore((state) => state.detectAndSyncActivePreset);

  // Track if user has dismissed the missing dialog (chose "Ignore")
  const [userIgnoredMissing, setUserIgnoredMissing] = useState(false);

  // Onboarding flow state
  const [onboardingStep, setOnboardingStep] = useState<'language' | 'credentials' | 'name' | 'done'>('done');
  const [checkingNameMigration, setCheckingNameMigration] = useState(true);

  // Sync i18n language with store on mount
  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Sync sunshineName from store to sunshine.conf on startup (for reinstall scenario)
  // This ensures the user's customized name is restored after a reinstall
  const [namesSynced, setNamesSynced] = useState(false);
  useEffect(() => {
    const syncStoredNameToSunshine = async () => {
      if (!sunshineName || namesSynced) return;
      if (sunshineInstalled !== true && !userIgnoredMissing) return;

      try {
        const currentName = await window.electronAPI.clients.getServerName();
        // Only sync if the current name differs from our stored name
        if (currentName !== sunshineName) {
          console.log('[App] Syncing stored sunshineName to sunshine.conf:', sunshineName);
          await window.electronAPI.clients.setServerName(sunshineName);
        }
        setNamesSynced(true);
      } catch (err) {
        console.error('[App] Error syncing sunshine name:', err);
      }
    };

    syncStoredNameToSunshine();
  }, [sunshineName, sunshineInstalled, userIgnoredMissing, namesSynced]);

  // Determine onboarding step based on what's missing
  useEffect(() => {
    const determineOnboardingStep = async () => {
      // 1. Language not set → show language dialog
      if (!language) {
        setOnboardingStep('language');
        setCheckingNameMigration(false);
        return;
      }

      // 2. Wait for Sunshine health check
      if (sunshineInstalled === null && !userIgnoredMissing) {
        return; // Still checking
      }

      // 3. Check if sunshineName needs setup or migration
      if (!sunshineName) {
        setCheckingNameMigration(true);
        try {
          // Get current name from sunshine.conf
          const currentName = await window.electronAPI.clients.getServerName();
          const hostname = await window.electronAPI.system.getHostname();

          // If name is "Sunshine", "Eclipse" (defaults) or matches hostname, show dialog
          const isDefaultName = currentName === 'Sunshine' || currentName === 'Eclipse' || currentName === hostname;

          if (isDefaultName) {
            // Need to ask user for a custom name
            setOnboardingStep('name');
          } else {
            // User has already customized the name (via localhost or previous version)
            // Migrate it to the store
            console.log('[App] Migrating existing sunshine name to store:', currentName);
            setSunshineName(currentName);
            setOnboardingStep('done');
          }
        } catch (err) {
          console.error('[App] Error checking sunshine name:', err);
          // Show dialog anyway on error
          setOnboardingStep('name');
        }
        setCheckingNameMigration(false);
        return;
      }

      // 4. Everything is set
      setOnboardingStep('done');
      setCheckingNameMigration(false);
    };

    determineOnboardingStep();
  }, [language, sunshineName, sunshineInstalled, userIgnoredMissing, setSunshineName]);

  // Check for Sunshine installation on mount (Story 10.2 - AC1)
  useEffect(() => {
    checkSunshineHealth();
  }, [checkSunshineHealth]);

  // Check for credentials on mount (Story 2.3 - AC1)
  // Only check after Sunshine health check completes, language is set, and onboarding is done
  useEffect(() => {
    if ((sunshineInstalled === true || userIgnoredMissing) && language && onboardingStep === 'done') {
      checkCredentials();
    }
  }, [sunshineInstalled, userIgnoredMissing, language, onboardingStep, checkCredentials]);

  // Epic 11: Sync active preset with Sunshine config on startup
  // This ensures the UI shows the correct active preset after app restart
  useEffect(() => {
    if (hasCredentials && (sunshineInstalled === true || userIgnoredMissing) && onboardingStep === 'done') {
      console.log('[App] Syncing active preset with Sunshine config...');
      detectAndSyncActivePreset();
    }
  }, [hasCredentials, sunshineInstalled, userIgnoredMissing, onboardingStep, detectAndSyncActivePreset]);

  // Show SunshineMissingDialog if Sunshine is missing/corrupted and not ignored
  const showMissingDialog =
    sunshineInstalled === false &&
    !userIgnoredMissing &&
    sunshineHealthResult !== null &&
    onboardingStep === 'done'; // Only show after onboarding

  const handleReinstall = async () => {
    const result = await window.electronAPI.sunshine.reinstall();
    return result;
  };

  const handleIgnore = () => {
    setUserIgnoredMissing(true);
  };

  const handleReinstallSuccess = () => {
    // Re-check health after reinstall
    checkSunshineHealth();
  };

  // Onboarding handlers
  const handleLanguageSelected = () => {
    // After language selection, check if we need name setup
    if (!sunshineName) {
      // Will be determined by the useEffect that checks sunshineName
    } else {
      setOnboardingStep('done');
    }
  };

  const handleNameSet = () => {
    setOnboardingStep('done');
  };

  const handleWelcomeContinue = () => {
    setOnboardingCompleted();
  };

  // Don't render main app until language is set (or during language selection)
  const showMainApp = language !== null && !checkingNameMigration && onboardingStep === 'done';

  // Show welcome dialog after credentials are set, but only once (first launch)
  const showWelcomeDialog = showMainApp && hasCredentials && !onboardingCompleted;

  return (
    <>
      {/* Onboarding: Language selection (first dialog) */}
      <LanguageDialog
        open={onboardingStep === 'language'}
        onLanguageSelected={handleLanguageSelected}
      />

      {/* Onboarding: Sunshine name setup (after language, if needed) */}
      <SunshineNameDialog
        open={onboardingStep === 'name' && !checkingNameMigration}
        onNameSet={handleNameSet}
      />

      {/* Story 10.2: Sunshine missing dialog (after onboarding) */}
      <SunshineMissingDialog
        isOpen={showMissingDialog}
        missingFiles={sunshineHealthResult?.missingFiles}
        onReinstall={handleReinstall}
        onIgnore={handleIgnore}
        onSuccess={handleReinstallSuccess}
      />

      {/* Story 2.3: Credentials setup dialog (after onboarding) */}
      {showMainApp && <SetupCredentialsDialog />}

      {/* Welcome dialog (shown once after credentials are set) */}
      <WelcomeDialog
        open={showWelcomeDialog}
        onContinue={handleWelcomeContinue}
      />

      {/* Main layout (only after onboarding is complete, including welcome) */}
      {showMainApp && !showWelcomeDialog && <MainLayout currentPage={currentPage} onPageChange={setPage} />}
    </>
  );
}

export default App;
