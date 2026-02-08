import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Edit2 } from 'lucide-react';
import { Button } from '../../common/ui/button';

interface CredentialsCardProps {
  username: string;
  password: string;
  onUpdateUsername: () => void;
  onUpdatePassword: () => void;
}

export function CredentialsCard({
  username,
  password,
  onUpdateUsername,
  onUpdatePassword,
}: CredentialsCardProps) {
  const { t } = useTranslation();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const maskPassword = (pwd: string) => {
    return pwd ? '••••••••' : t('dashboard.credentials.notConfigured');
  };

  const displayUsername = username || t('dashboard.credentials.notConfigured');
  const displayPassword = isPasswordVisible ? password : maskPassword(password);

  return (
    <div className="space-y-4">
      {/* Username Row */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[13px] text-text-secondary mb-1">{t('dashboard.credentials.username')}</p>
          <p className="text-[14px] text-text-primary font-medium">{displayUsername}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUpdateUsername}
          className="text-text-secondary hover:text-text-primary"
          aria-label={t('dashboard.credentials.editUsername')}
        >
          <Edit2 size={16} />
        </Button>
      </div>

      {/* Password Row */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[13px] text-text-secondary mb-1">{t('dashboard.credentials.password')}</p>
          <div className="flex items-center gap-2">
            <p className="text-[14px] text-text-primary font-medium">{displayPassword}</p>
            {password && (
              <button
                onClick={togglePasswordVisibility}
                className="text-text-secondary hover:text-text-primary transition-colors"
                aria-label={isPasswordVisible ? t('dashboard.credentials.hidePassword') : t('dashboard.credentials.showPassword')}
                type="button"
              >
                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUpdatePassword}
          className="text-text-secondary hover:text-text-primary"
          aria-label={t('dashboard.credentials.editPassword')}
        >
          <Edit2 size={16} />
        </Button>
      </div>
    </div>
  );
}
