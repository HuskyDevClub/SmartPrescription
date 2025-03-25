export interface MedicalPrescription {
    name: string;
    usage: string;
    qty: number;
    refills: number;
    discard: string;
    note: string;
    taken: number;
    skipped: number;
    reminderTimes?: string[]; // Store time in 24-hour format (HH:MM)
}