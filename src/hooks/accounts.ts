import { useCachedPromise } from '@raycast/utils'
import { ensureDefaultAccount, getActiveAccount } from '../utils/accounts'

export function useActiveAccount() {
  const {
    data: account,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    await ensureDefaultAccount()
    return getActiveAccount()
  })

  return { account, isLoading, revalidate }
}
