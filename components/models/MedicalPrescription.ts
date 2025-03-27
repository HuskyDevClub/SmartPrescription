export interface AbstractMedicalPrescription {
    name: string;
    doseQty: number;
    doseUnit: string;
}

export interface MedicalPrescription extends AbstractMedicalPrescription {
    route: string;
    days: number;
    frequency: string;
    createdAt: string;
}