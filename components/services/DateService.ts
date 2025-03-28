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

    // Helper function to format date as YYYY-MM-DD
    public static formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    };

    // Helper function to format date as Month D, YYYY
    public static formatDisplayDate(dateString: string): string {
        return (new Date(dateString)).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
    };

    // Convert time string to display format (12-hour with AM/PM)
    public static formatTimeForDisplay(timeString?: string): string {
        if (!timeString) return 'No reminder';
        const [hours, minutes] = timeString.split(':').map(Number);
        const displayHours: number = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
    };
}