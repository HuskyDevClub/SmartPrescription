import { AbstractAsyncService } from "@/components/services/AbstractAsyncService";
import { UserDataService } from "@/components/services/UserDataService";

export const API_BASE_URL: string = 'https://wevv2czb52.execute-api.us-east-1.amazonaws.com';
const NAME = "Auth";

export interface AuthUser {
    id: string;
    email: string;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
}

export class AuthService extends AbstractAsyncService {
    public static current: AuthState = {
        token: null,
        user: null,
    };

    private static isInitialized = false;

    public static isAuthenticated(): boolean {
        return !!this.current.token && !!this.current.user;
    }

    public static getToken(): string | null {
        return this.current.token;
    }

    public static async login(email: string, password: string): Promise<void> {
        await this.init();
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password}),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error || "Failed to login");
        }
        this.current = {token: data.token, user: data.user};
        await UserDataService.set(NAME, this.current);
    }

    public static async register(email: string, password: string): Promise<void> {
        await this.init();
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password}),
        });
        console.log('[AuthService] Response status:', res.status);

        const data = await res.json();
        console.log('[AuthService] Response data:', data);
        if (!res.ok) {
            throw new Error(data?.error || "Failed to register");
        }
        this.current = {token: data.token, user: data.user};
        await UserDataService.set(NAME, this.current);
    }

    public static async logout(): Promise<void> {
        await this.init();
        this.current = {token: null, user: null};
        await UserDataService.set(NAME, this.current);
    }

    protected static override async initialize(): Promise<void> {
        this.current = await UserDataService.try_get(NAME, {token: null, user: null});
    }

    protected static override getInit(): boolean {
        return this.isInitialized;
    }

    protected static override setInit(status: boolean): void {
        this.isInitialized = status;
    }
}
