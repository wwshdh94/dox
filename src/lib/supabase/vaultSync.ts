import { useVaultStore } from '@/store/useVaultStore';
import { mergeServerVault, pullHouseholdVault } from '@/lib/supabase/documents';

/** Pull household documents + share grants from Supabase and merge into local vault. */
export async function syncHouseholdVaultFromServer(): Promise<void> {
  const result = await pullHouseholdVault();
  if (!result.ok) return;

  const state = useVaultStore.getState();
  const merged = mergeServerVault(
    state.documents,
    state.shareGrants,
    result.documents,
    result.shareGrants,
  );

  useVaultStore.setState({
    documents: merged.documents,
    shareGrants: merged.shareGrants,
  });
}
