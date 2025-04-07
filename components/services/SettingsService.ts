import {AbstractAsyncService} from "@/components/services/AbstractAsyncService";
import {UserDataService} from "@/components/services/UserDataService";

const NAME: string = "Settings"

interface SettingsState {
    snoozeTime: number;
    notificationsEnabled: boolean;
    breakfastTime: string;
    lunchTime: string;
    dinnerTime: string;
}


export class SettingsService extends AbstractAsyncService {

    public static current: SettingsState = {
        snoozeTime: 5,
        notificationsEnabled: true,
        breakfastTime: "8:00",
        lunchTime: "13:00",
        dinnerTime: "18:00"
    };
    private static isInitialized: boolean = false;

    public static async save(): Promise<void> {
        await UserDataService.save();
    }

    protected static override async initialize(): Promise<void> {
        // Get ref from user data
        this.current = {...this.current, ...await UserDataService.try_get(NAME, {})};
    }

    protected static override getInit(): boolean {
        return this.isInitialized;
    }

    protected static override setInit(status: boolean): void {
        this.isInitialized = status
    }
}