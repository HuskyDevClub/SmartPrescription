import {PrescriptionRecord} from "@/components/models/MedicalPrescription";
import {UserDataService} from "@/components/services/UserDataService";
import * as Notifications from 'expo-notifications';
import {NotificationContentInput, SchedulableTriggerInputTypes} from 'expo-notifications';
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

    public static getArchivedPrescriptions(): PrescriptionRecord[] {
        return this.prescriptionsRef.filter(p => p.archived);
    }

    public static getActivePrescriptions(): PrescriptionRecord[] {
        return this.prescriptionsRef.filter(p => !p.archived);
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
    public static async handleMedicationTaken(id: string | unknown, notificationId: string | unknown): Promise<void> {
        // Make sure ids are not unknown
        if (typeof (id) != "string" || typeof (notificationId) != "string") return;

        // Find prescription with given id
        await this.init();
        const thePrescription: PrescriptionRecord | undefined = this.getPrescription(id);

        // Make sure the prescription exist
        if (thePrescription === undefined) return;

        // Get the date time that the medication is taken
        const dateTaken: Date = new Date();
        const timeParts: number[] = notificationId.split("_").map(Number);
        dateTaken.setHours(timeParts[1], timeParts[2], 0, 0);

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
    public static async snoozeMedicationTaken(id: string | unknown, notificationId: string | unknown, intendedTakenTime: Date | null | unknown): Promise<void> {
        // Make sure ids are not unknown
        if (typeof (id) != "string" || typeof (notificationId) != "string") return;

        // The total time that has been snoozed so far
        let currentSnoozeTime: number = 0
        // If first time snooze, then note down the time it is intended to be taken
        let theIntendedTakenTime: Date;
        if (intendedTakenTime instanceof Date) {
            theIntendedTakenTime = new Date(intendedTakenTime);
            // calculate the difference in minutes
            currentSnoozeTime = Math.floor((new Date().getTime() - theIntendedTakenTime.getTime()) / 60000);
        } else {
            theIntendedTakenTime = new Date();
        }

        // Continue to schedule the notification if less than 60 min
        if (currentSnoozeTime <= 60) {
            // Find prescription with given id
            await this.init();
            const thePrescription: PrescriptionRecord | undefined = this.getPrescription(id);
            // If we cannot find the perception for some reason, then do not reschedule notification
            if (thePrescription === undefined) return;
            // The notification identifier
            const notificationIdentifier: string = `${thePrescription.id}_${theIntendedTakenTime.getTime()}_snoozed`
            // Reschedule notification
            await Notifications.scheduleNotificationAsync({
                content: this.getNotificationContent(thePrescription, notificationIdentifier, theIntendedTakenTime),
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: SettingsService.current.snoozeTime * 60
                },
                identifier: notificationIdentifier,
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
                for (const reminderTimeObj of prescription.reminderTimes) {
                    const reminderDateTime = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        currentDate.getDate(),
                        reminderTimeObj.hours,
                        reminderTimeObj.minutes,
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
            endAt: new Date(),
            archived: false,
        }
    }

    // Clear all records
    public static async clear(): Promise<void> {
        await UserDataService.delete(NAME)
        this.setInit(false)
        await this.init()
    }

    public static notEmpty(): boolean {
        return this.prescriptionsRef.length > 0;
    }

    // Update the buttons available for Notifications
    public static async updateNotificationButtons(): Promise<void> {
        await Notifications.setNotificationCategoryAsync('medication-reminder', [
            {
                identifier: 'TAKEN_ACTION',
                buttonTitle: 'Taken',
                options: {
                    isDestructive: false,
                    isAuthenticationRequired: false,
                    opensAppToForeground: false,
                }
            },
            {
                identifier: 'SNOOZE_ACTION',
                buttonTitle: `Snooze for ${SettingsService.current.snoozeTime} min`,
                options: {
                    isDestructive: false,
                    isAuthenticationRequired: false,
                    opensAppToForeground: false,
                }
            },
            {
                identifier: 'SKIP_ACTION',
                buttonTitle: 'Skip',
                options: {
                    isDestructive: false,
                    isAuthenticationRequired: false,
                    opensAppToForeground: false,
                }
            }
        ]);
    }

    // Get the content for notification
    public static getNotificationContent(record: PrescriptionRecord, notificationId: string, intendedTakenTime: Date | null): NotificationContentInput {
        return {
            title: 'Medication Reminder',
            body: `Time to take your ${record.name}${record.dosage.length > 0 ? ` (${record.dosage})` : ""}` + (record.food == 0 ? "." : `, take it ${record.food === 1 ? "before" : "after"} food.`),
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
                id: record.id,
                notificationId,
                intendedTakenTime
            },
            autoDismiss: false,
            categoryIdentifier: 'medication-reminder',
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
        for (const theReminderTime of item.reminderTimes) {
            // The notification identifier
            const notificationIdentifier: string = `${item.id}_${theReminderTime.hours}_${theReminderTime.minutes}`
            // Schedule the notification
            await Notifications.scheduleNotificationAsync({
                content: this.getNotificationContent(item, notificationIdentifier, null),
                trigger: {
                    type: SchedulableTriggerInputTypes.DAILY,
                    hour: theReminderTime.hours,
                    minute: theReminderTime.minutes
                },
                identifier: notificationIdentifier
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
        // await this.rescheduleAllNotifications()
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