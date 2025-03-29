import {PrescriptionRecord} from "@/components/models/MedicalPrescription";
import {UserDataService} from "@/components/services/UserDataService";
import * as Notifications from 'expo-notifications';
import {SchedulableTriggerInputTypes} from 'expo-notifications';

const NAME: string = "Prescriptions";

export class PrescriptionService {

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
        this.ensureInit()
        // Add item to list
        this.prescriptionsRef.push(newItem);
        // Schedule notifications for the new item
        await PrescriptionService.scheduleNotifications(newItem);
        // Save changes
        await UserDataService.save();
    }

    public static async removePrescription(id: string): Promise<void> {
        const index: number = this.prescriptionsRef.findIndex(item => item.id === id)
        if (index >= 0) {
            // Cancel all notifications for deleted item
            await PrescriptionService.cancelAllNotifications(id);
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
        await this.cancelAllNotifications(item.id);

        // No need to schedule notification for expired prescription
        if (this.isPrescriptionExpired(item)) return;

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

    // Cancel all notifications for a medication
    public static async cancelAllNotifications(id: string): Promise<void> {
        for (const n of (await Notifications.getAllScheduledNotificationsAsync()).filter(n => n.identifier.startsWith(id))) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier)
        }
    };

    // Ensure prescriptions are loaded
    public static async init(): Promise<void> {
        if (this.isInitialized) return;

        // Get ref from user data
        this.prescriptionsRef = await UserDataService.try_get(NAME, []);

        // Re-schedule notifications for all prescriptions with reminder times
        await Notifications.cancelAllScheduledNotificationsAsync();
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

        // Flip the flag
        this.isInitialized = true;
    }

    private static ensureInit(): void {
        if (this.isInitialized) return;
        throw Error('PrescriptionService Not initialized');
    }
}