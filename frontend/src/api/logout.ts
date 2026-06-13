import { clearCredentials } from '@/utils/localstorageCredentials';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logout(api: any) {
    clearCredentials();
    await api.logout();
}
