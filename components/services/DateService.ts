export class DateService {
    // Helper function to check if a date is same or before another date (day precision)
    public static isDateSameOrBefore(date1: number | string | Date, date2: number | string | Date): boolean {
        const d1 = new Date(date1);
        const d2 = new Date(date2);

        // Reset hours to compare dates only
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);

        return d1 <= d2;
    };

    // Helper function to check if a date is same or after another date (day precision)
    public static isDateSameOrAfter(date1: number | string | Date, date2: number | string | Date): boolean {
        const d1 = new Date(date1);
        const d2 = new Date(date2);

        // Reset hours to compare dates only
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);

        return d1 >= d2;
    };

    // Convert time string to display format (12-hour with AM/PM)
    public static formatTimeForDisplay(theReminderTime?: ReminderTime): string {
        if (!theReminderTime) return 'No reminder';
        const displayHours: number = theReminderTime.hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${theReminderTime.minutes.toString().padStart(2, '0')} ${theReminderTime.hours >= 12 ? 'PM' : 'AM'}`;
    };

    // Get current date in YYYY-MM-DD format
    public static getFormattedDate(date: Date): string {

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    // Get time string from date
    public static getTime(theDate: Date | undefined = undefined): ReminderTime {
        if (!theDate) {
            theDate = new Date();
        }
        return {hours: theDate.getHours(), minutes: theDate.getMinutes(), label: ""};
    };
}