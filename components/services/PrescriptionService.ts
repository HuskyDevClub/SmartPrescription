import {PrescriptionRecord} from "@/components/models/MedicalPrescription";
import {UserDataService} from "@/components/services/UserDataService";
import * as Notifications from 'expo-notifications';
import {SchedulableTriggerInputTypes} from 'expo-notifications';
import {AbstractAsyncService} from "@/components/services/AbstractAsyncService";
import {SettingsService} from "@/components/services/SettingsService";

const NAME: string = "Prescriptions";

export class PrescriptionService extends AbstractAsyncService {

    private static isInitialized: boolean = false;
    // Reference to keep track of the most up-to-date prescriptions state
    private static prescriptionsRef: PrescriptionRecord[] = [];

    // Is the prescription expired
    public static isPrescriptionExpired(p: PrescriptionRecord): boolean {
        // Get current date and reset time to midnight
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        // Create a new Date object with just the date part
        const expiryDate = new Date(p.endAt);
        expiryDate.setHours(0, 0, 0, 0);

        return expiryDate < currentDate;
    }

    public static getPrescription(id: string): PrescriptionRecord | undefined {
        this.ensureInit()
        return this.prescriptionsRef.find(item => item.id === id);
    }

    public static getAllPrescriptions(): PrescriptionRecord[] {
        this.ensureInit()
        return this.prescriptionsRef;
    }

    public static getExpiredPrescriptions(): PrescriptionRecord[] {
        return this.prescriptionsRef.filter(p => this.isPrescriptionExpired(p));
    }

    public static getNotExpiredPrescriptions(): PrescriptionRecord[] {
        return this.prescriptionsRef.filter(p => !this.isPrescriptionExpired(p));
    }

    public static async addPrescription(newItem: PrescriptionRecord): Promise<void> {
        await this.init();
        // Add item to list
        this.prescriptionsRef.push(newItem);
        // Schedule notifications for the new item
        await this.scheduleNotifications(newItem);
        // Save changes
        await UserDataService.save();
    }

    public static async removePrescription(id: string): Promise<void> {
        await this.init();
        const index: number = this.prescriptionsRef.findIndex(item => item.id === id)
        if (index >= 0) {
            // Cancel all notifications for deleted item
            await this.cancelPrescriptionNotifications(id);
            // Remove item on given index
            this.prescriptionsRef.splice(index, 1);
            // Save changes
            await UserDataService.save();
        }
    }

    // Handle medication taken action
    public static async handleMedicationTaken(id: string, notificationId: string): Promise<void> {
        // Find prescription with given id
        const thePrescription: PrescriptionRecord | undefined = this.getPrescription(id);

        if (thePrescription) {
            // Increment taken count
            thePrescription.taken += 1;

            // Save to persistent storage
            await UserDataService.save();

            // Dismiss the notification
            await Notifications.dismissNotificationAsync(notificationId);
        }
    };

    // Handle medication skipped action
    public static async handleMedicationSkipped(id: string, notificationId: string): Promise<void> {
        // Find prescription with given id
        const thePrescription: PrescriptionRecord | undefined = this.getPrescription(id);

        if (thePrescription) {
            // Increment skipped count
            thePrescription.skipped += 1;

            // Save to persistent storage
            await UserDataService.save();

            // Dismiss the notification
            await Notifications.dismissNotificationAsync(notificationId);
        }
    };

    public static new(): PrescriptionRecord {
        return {
            id: '',
            name: '',
            dosage: "",
            type: "",
            food: 0,
            taken: 0,
            skipped: 0,
            reminderTimes: [],
            startAt: new Date(),
            endAt: new Date()
        }
    }

    // Schedule notifications for all reminder times of a medication
    public static async scheduleNotifications(item: PrescriptionRecord): Promise<void> {
        if (!item.reminderTimes || item.reminderTimes.length === 0) return;

        // Cancel any existing notifications for this item
        await this.cancelPrescriptionNotifications(item.id);

        // No need to schedule notification for expired prescription
        if (this.isPrescriptionExpired(item)) return;

        // Do not notify if notification has been disabled
        await SettingsService.init();
        if (!SettingsService.current.notificationsEnabled) return;

        // Schedule a notification for each reminder time
        for (let i = 0; i < item.reminderTimes.length; i++) {
            const reminderTime = item.reminderTimes[i];
            // Parse the reminder time
            const [hours, minutes] = reminderTime.split(':').map(Number);

            // Schedule the notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Medication Reminder',
                    body: `Time to take your ${item.name}.`,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: {id: item.id},
                    categoryIdentifier: 'medication-reminder',
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.DAILY,
                    hour: hours,
                    minute: minutes
                },
                identifier: `${item.id}_time_${i}`
            });
        }
    }

    // Schedule all notifications for all medications
    public static async setNotificationsEnable(value: boolean): Promise<void> {
        SettingsService.current.notificationsEnabled = value
        await SettingsService.save();
        if (value) {
            await this.scheduleAllNotifications()
        } else {
            await this.cancelAllNotifications()
        }
    };

    protected static override getInit(): boolean {
        return this.isInitialized;
    }

    protected static override setInit(status: boolean): void {
        this.isInitialized = status
    }

    // Ensure prescriptions are loaded
    protected static override async initialize(): Promise<void> {
        // Get ref from user data
        this.prescriptionsRef = await UserDataService.try_get(NAME, []);

        // Re-schedule notifications for all prescriptions with reminder times
        await this.cancelAllNotifications();
        await this.scheduleAllNotifications();
    }

    // Cancel all notifications for a medication
    private static async cancelPrescriptionNotifications(id: string): Promise<void> {
        for (const n of (await Notifications.getAllScheduledNotificationsAsync()).filter(n => n.identifier.startsWith(id))) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier)
        }
    };

    // Cancel all notifications for all medications
    private static async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
    };

    // Schedule all notifications for all medications
    private static async scheduleAllNotifications(): Promise<void> {
        for (const p of this.prescriptionsRef) {
            await this.scheduleNotifications(p);
        }
        // Log debug info
        if (__DEV__) {
            const allScheduledNotificationsAsync = await Notifications.getAllScheduledNotificationsAsync();
            if (allScheduledNotificationsAsync?.length > 0) {
                console.log(`In total of ${allScheduledNotificationsAsync.length} notification(s):`);
                allScheduledNotificationsAsync.forEach(n => console.log(n))
            } else {
                console.log("No notification");
            }
        }
    };
}