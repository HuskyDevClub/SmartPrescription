export interface MedicalPrescription {
    name: string;
    usage: string;
    qty: number;
    refills: number;
    discard: string;
    note: string;
    reminderTimes?: string[]; // Store time in 24-hour format (HH:MM)
}