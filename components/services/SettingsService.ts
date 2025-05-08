import {AbstractAsyncService} from "@/components/services/AbstractAsyncService";
import {UserDataService} from "@/components/services/UserDataService";
import {ReminderTime} from "@/components/models/ReminderTime";

const NAME: string = "Settings"

interface SettingsState {
    snoozeTime: number;
    notificationsEnabled: boolean;
    breakfastTime: ReminderTime;
    lunchTime: ReminderTime;
    dinnerTime: ReminderTime;
}

export enum ThreeMeals {
    Breakfast = 'Breakfast',
    Lunch = "Lunch",
    Dinner = "Dinner",
}

export class SettingsService extends AbstractAsyncService {

    public static current: SettingsState = {
        snoozeTime: 5,
        notificationsEnabled: true,
        breakfastTime: {hours: 8, minutes: 0, label: ThreeMeals.Breakfast},
        lunchTime: {hours: 13, minutes: 0, label: ThreeMeals.Lunch},
        dinnerTime: {hours: 18, minutes: 0, label: ThreeMeals.Dinner}
    };
    private static isInitialized: boolean = false;

    public static async save(): Promise<void> {
        await UserDataService.set(NAME, this.current)
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