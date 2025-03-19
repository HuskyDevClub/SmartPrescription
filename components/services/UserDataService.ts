// require the module
import * as FileSystem from 'expo-file-system';

const PATH: string = FileSystem.documentDirectory + "userData.json";

export class UserDataService {

    private static isInitialized: boolean = false;

    private static VALUES: Record<string, any> = {};

    public static async try_get(k: string, default_v: any): Promise<any> {
        await this.init();
        if (!(k in this.VALUES)) {
            this.VALUES[k] = default_v;
            return default_v;
        }
        return this.VALUES[k];
    }

    public static async get(k: string): Promise<any> {
        await this.init();
        return this.VALUES[k];
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

    // Create or ensure the config file exists
    private static async init(): Promise<void> {
        if (this.isInitialized) return;
        try {
            //console.log(await this.getPath());
            if ((await FileSystem.getInfoAsync(PATH)).exists) {
                const data: string = await FileSystem.readAsStringAsync(PATH, {encoding: "utf8"});
                this.VALUES = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error creating config file:', error);
        }
    }
}