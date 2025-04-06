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
        await this.init();
        const thePrescription: PrescriptionRecord | undefined = this.getPrescription(id);

        // Make sure the prescription exist
        if (thePrescription === undefined) return;

        // Get the date time that the medication is taken
        const dateTaken: Date = new Date();
        const timeParts: string[] = notificationId.split("_");
        dateTaken.setHours(Number(timeParts[1]), Number(timeParts[2]), 0, 0);

        // Add date time to taken list
        const dateStr: string = dateTaken.toString();
        if (thePrescription.taken.includes(dateStr)) return;
        thePrescription.taken.push(dateStr);

        // Save to persistent storage
        await UserDataService.save();

        // Dismiss the notification
        await Notifications.dismissNotificationAsync(notificationId);
    };

    // Handle medication taken action
    public static async snoozeMedicationTaken(id: string, notificationId: string): Promise<void> {
        // Find prescription with given id
        await this.init();
        const thePrescription: PrescriptionRecord | undefined = this.getPrescription(id);

        if (thePrescription === undefined) return;

        // Parse the reminder time
        const [_, hours, minutes, currentSnoozeTime] = notificationId.split('_').map(Number);
        const minutesNum: number = Number(minutes);
        const nextSnoozeTimeNum: number = Number(currentSnoozeTime) + minutesNum;

        // Schedule the notification
        if (nextSnoozeTimeNum <= 60) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Medication Reminder',
                    body: `Time to take your ${thePrescription.name}.`,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: {
                        id: thePrescription.id,
                        notificationId: `${thePrescription.id}_${hours}_${minutes}_${nextSnoozeTimeNum}`
                    },
                    categoryIdentifier: 'medication-reminder',
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: minutesNum * 60
                },
                identifier: `${thePrescription.id}_${hours}_${minutes}_${nextSnoozeTimeNum}`
            });
        }

        // Dismiss the notification
        await Notifications.dismissNotificationAsync(notificationId);
    };

    public static calculateDosesTakenSoFar(prescription: PrescriptionRecord): number {
        // Get current date and time
        const now = new Date();

        // Get the date of startAt
        const startAt = new Date(prescription.startAt);
        startAt.setHours(0, 0, 0, 0);

        // If treatment hasn't started yet
        if (now < startAt) {
            return 0;
        }

        // If treatment has ended, use the end date as our cutoff
        const endAt: Date = new Date(prescription.endAt);
        const cutoffDate: Date = now < endAt ? now : endAt;

        let totalDosesTaken: number = 0;

        // Loop through each day from start to cutoff
        const currentDate: Date = new Date(prescription.startAt);
        // Reset the time part to ensure we're at the beginning of the day
        currentDate.setHours(0, 0, 0, 0);

        // Create a date representing the day of the cutoff (without time)
        const cutoffDay = new Date(cutoffDate);
        cutoffDay.setHours(0, 0, 0, 0);

        while (currentDate <= cutoffDay) {
            // For previous days, all doses were taken
            if (currentDate < cutoffDay) {
                totalDosesTaken += prescription.reminderTimes.length;
            }
            // For today, only count doses whose reminder times have passed
            else {
                for (const reminderTime of prescription.reminderTimes) {
                    const [hours, minutes] = reminderTime.split(':').map(Number);

                    const reminderDateTime = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        currentDate.getDate(),
                        hours,
                        minutes
                    );

                    // Skip if this reminder is before the start time (first day)
                    if (reminderDateTime < startAt) {
                        continue;
                    }

                    // Skip if this reminder is in the future
                    if (reminderDateTime > now) {
                        continue;
                    }

                    totalDosesTaken++;
                }
            }

            // Move to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return totalDosesTaken;
    }

    public static new(): PrescriptionRecord {
        return {
            id: '',
            name: '',
            dosage: "",
            type: "",
            food: 0,
            taken: [],
            reminderTimes: [],
            startAt: new Date(),
            endAt: new Date()
        }
    }

    // Clear all records
    public static async clear(): Promise<void> {
        await UserDataService.delete(NAME)
        await this.init()
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
                    data: {
                        id: item.id,
                        notificationId: `${item.id}_${hours}_${minutes}_0`
                    },
                    categoryIdentifier: 'medication-reminder',
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.DAILY,
                    hour: hours,
                    minute: minutes
                },
                identifier: `${item.id}_${hours}_${minutes}_0`
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

    // Re-schedule notifications for all prescriptions with reminder times
    public static async rescheduleAllNotifications(): Promise<void> {
        await this.cancelAllNotifications();
        await this.scheduleAllNotifications();
    }

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
        await this.rescheduleAllNotifications()
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