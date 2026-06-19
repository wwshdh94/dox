import { useEffect, useState } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { debug } from '@/lib/debug';

/** Wait for zustand persist to rehydrate before auth redirects. */
export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState(() => useVaultStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    if (useVaultStore.persist.hasHydrated()) {
      setHydrated(true);
      debug('hydration', 'already hydrated');
      return;
    }
    const unsub = useVaultStore.persist.onFinishHydration(() => {
      debug('hydration', 'rehydration complete');
      setHydrated(true);
    });
    return unsub;
  }, [hydrated]);

  return hydrated;
}
