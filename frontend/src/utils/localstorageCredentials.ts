const STORAGE_SERVER_KEY = 'jf_server';
const STORAGE_USER_KEY = 'jf_user';
const STORAGE_TOKEN_KEY = 'jf_token';
const STORAGE_USERNAME_KEY = 'jf_username';
const STORAGE_PASSWORD_KEY = 'jf_password';

export function getServerUrl(): string | null {
    return localStorage.getItem(STORAGE_SERVER_KEY);
}

export function saveServerUrl(serverUrl: string): void {
    localStorage.setItem(STORAGE_SERVER_KEY, serverUrl);
}

export function getUserId(): string | null {
    return localStorage.getItem(STORAGE_USER_KEY);
}

export function getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
}

export function getUsername(): string | null {
    return localStorage.getItem(STORAGE_USERNAME_KEY);
}

export function getPassword(): string | null {
    return localStorage.getItem(STORAGE_PASSWORD_KEY);
}

export function setPassword(password: string): void {
    localStorage.setItem(STORAGE_PASSWORD_KEY, password);
}

export function saveCredentials(serverUrl: string, userId: string, accessToken: string, username?: string, password?: string): void {
    localStorage.setItem(STORAGE_SERVER_KEY, serverUrl);
    localStorage.setItem(STORAGE_USER_KEY, userId);
    localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
    if (username) localStorage.setItem(STORAGE_USERNAME_KEY, username);
    if (password) localStorage.setItem(STORAGE_PASSWORD_KEY, password);
}

export function clearCredentials(): void {
    localStorage.removeItem(STORAGE_SERVER_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USERNAME_KEY);
    localStorage.removeItem(STORAGE_PASSWORD_KEY);
}
