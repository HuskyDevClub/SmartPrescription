// require the module
import * as FileSystem from 'expo-file-system';
import {AbstractAsyncService} from "@/components/services/AbstractAsyncService";

const PATH: string = FileSystem.documentDirectory + "userData.json";

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
            await FileSystem.writeAsStringAsync(PATH, JSON.stringify(this.VALUES, null, 2), {encoding: "utf8"});
            // console.log(this.VALUES)
        } catch (error) {
            console.error('Error saving config file:', error);
        }
    }

    // Create or load the existing user data file
    protected static override async initialize(): Promise<void> {
        if (!(await FileSystem.getInfoAsync(PATH)).exists) return;
        const data: string = await FileSystem.readAsStringAsync(PATH, {encoding: "utf8"});
        this.VALUES = JSON.parse(data);
    }

    protected static override getInit(): boolean {
        return this.isInitialized;
    }

    protected static override setInit(status: boolean): void {
        this.isInitialized = status
    }
}