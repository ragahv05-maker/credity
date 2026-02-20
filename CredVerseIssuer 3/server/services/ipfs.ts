import { PinataSDK } from "pinata-web3";

export class IpfsService {
    private pinata: PinataSDK;
    private jwt: string;
    private gateway: string;

    constructor() {
        this.jwt = process.env.PINATA_JWT || "";
        this.gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";

        this.pinata = new PinataSDK({
            pinataJwt: this.jwt,
            pinataGateway: this.gateway,
        });
    }

    async uploadJSON(data: any): Promise<string> {
        try {
            this.requireJwt();

            const upload = await this.pinata.upload.json(data);
            console.log(`Uploaded to IPFS: ${upload.IpfsHash}`);
            return upload.IpfsHash;
        } catch (error) {
            console.error("Failed to upload to IPFS:", error);
            if (error instanceof Error && error.message.includes('PINATA_JWT is required')) {
                throw error;
            }
            throw new Error("IPFS upload failed");
        }
    }

    getGatewayUrl(cid: string): string {
        return `https://${this.gateway}/ipfs/${cid}`;
    }

    private requireJwt(): void {
        if (!this.jwt) {
            throw new Error("PINATA_JWT is required for IPFS uploads");
        }
    }

    async uploadFile(buffer: Buffer, fileName: string, mimeType: string, retries = 3): Promise<string> {
        this.requireJwt();

        let lastError: Error | null = null;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const blob = new Blob([buffer], { type: mimeType });
                const file = new File([blob], fileName, { type: mimeType });
                const upload = await this.pinata.upload.file(file);
                console.log(`Uploaded file to IPFS: ${upload.IpfsHash}`);
                return upload.IpfsHash;
            } catch (error: any) {
                lastError = error;
                if (attempt < retries - 1) {
                    const backoffMs = 500 * Math.pow(2, attempt);
                    await new Promise((resolve) => setTimeout(resolve, backoffMs));
                }
            }
        }
        throw new Error(`IPFS file upload failed after ${retries} attempts: ${lastError?.message}`);
    }
}

export const ipfsService = new IpfsService();
