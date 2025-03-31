export abstract class AbstractAsyncService {

    public static async init(): Promise<void> {
        if (this.getInit()) return;

        await this.initialize();

        // Flip the flag
        this.setInit(true);
    }

    protected static ensureInit(): void {
        if (this.getInit()) return;
        throw Error('PrescriptionService Not initialized');
    }

    protected static async initialize(): Promise<void> {
    }

    protected static getInit(): boolean {
        return false;
    }

    protected static setInit(status: boolean): void {
    }
}