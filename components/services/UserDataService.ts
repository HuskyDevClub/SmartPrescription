import { File, Paths } from 'expo-file-system';
import { AbstractAsyncService } from "@/components/services/AbstractAsyncService";

const PATH: string = Paths.document.uri + "userData.json";

export class UserDataService extends AbstractAsyncService {
    private static isInitialized: boolean = false;
    private static VALUES: Record<string, any> = {};

    public static async try_get(k: string, default_v: any): Promise<any> {
        await this.init();
        if (k in this.VALUES) {
            return this.VALUES[k];
        }
        this.VALUES[k] = default_v;
        return default_v;
    }

    public static async get(k: string): Promise<any> {
        await this.init();
        return this.VALUES[k];
    }

    public static async set(k: string, v: any): Promise<void> {
        await this.init();
        this.VALUES[k] = v;
        await this.save();
    }

    public static async delete(k: string): Promise<void> {
        await this.init();
        delete this.VALUES[k];
        await this.save();
    }

    // Save the config file
    public static async save(): Promise<void> {
        try {
            const file = new File(PATH);
            // Create the file if it doesn't exist
            if (!file.exists) {
                file.create();
            }
            file.write(JSON.stringify(this.VALUES, null, 2));
        } catch (error) {
            console.error('Error saving config file:', error);
        }
    }

    // Create or load the existing user data file
    protected static override async initialize(): Promise<void> {
        const file = new File(PATH);
        if (!file.exists) return;
        const data: string = await file.text();
        this.VALUES = JSON.parse(data);
    }

    protected static override getInit(): boolean {
        return this.isInitialized;
    }

    protected static override setInit(status: boolean): void {
        this.isInitialized = status;
    }
}