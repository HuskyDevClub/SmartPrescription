export interface AbstractMedicalPrescription {
    name: string;
    dosage: string;
    type: string;
    food: number;
}

export interface MedicalPrescription extends AbstractMedicalPrescription {
    route: string;
    days: number;
    frequency: string;
    createdAt: string;
}

export interface PrescriptionRecord extends AbstractMedicalPrescription {
    id: string;
    taken: number;
    skipped: number;
    reminderTimes: string[]; // Store time in 24-hour format (HH:MM)
    startAt: Date;
    endAt: Date;
}
