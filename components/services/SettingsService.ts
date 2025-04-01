import {AbstractAsyncService} from "@/components/services/AbstractAsyncService";
import {UserDataService} from "@/components/services/UserDataService";

const NAME: string = "Settings"

interface SettingsState {
    snoozeTime: number;
    notificationsEnabled: boolean;
    fontSize: FontSizeEnum;
}

export enum FontSizeEnum {
    small = 16,
    medium = 24,
    large = 32,
}

export class SettingsService extends AbstractAsyncService {

    public static current: SettingsState = {
        snoozeTime: 5,
        notificationsEnabled: true,
        fontSize: FontSizeEnum.small,
    };
    private static isInitialized: boolean = false;

    public static async save(): Promise<void> {
        await UserDataService.save();
    }

    protected static override async initialize(): Promise<void> {
        // Get ref from user data
        this.current = await UserDataService.try_get(NAME, this.current);
    }

    protected static override getInit(): boolean {
        return this.isInitialized;
    }

    protected static override setInit(status: boolean): void {
        this.isInitialized = status
    }
}