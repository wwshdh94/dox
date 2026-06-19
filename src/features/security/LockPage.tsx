import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';

export function LockPage() {
  const [pin, setPin] = useState('');
  const unlock = useVaultStore((s) => s.unlock);
  const navigate = useNavigate();

  return (
    <div className="min-h-full pb-8">
      <Header title="Unlock" backTo="/profile/security" />
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-4xl">🔒</div>
          <p className="text-sm text-muted">Enter your PIN to unlock Dox</p>
          <Input
            label="PIN"
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={() => {
              if (unlock(pin)) navigate(-1);
            }}
          >
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
