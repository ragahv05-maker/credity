import { PinataSDK } from "pinata-web3";

export class IpfsService {
    private pinata: PinataSDK;
    private jwt: string;
    private gateway: string;

    constructor() {
        // In production, load from env vars
        this.jwt = process.env.PINATA_JWT || "mock_jwt";
        this.gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";

        this.pinata = new PinataSDK({
            pinataJwt: this.jwt,
            pinataGateway: this.gateway,
        });
    }

    async uploadJSON(data: any): Promise<string> {
        try {
            if (this.jwt === "mock_jwt") {
                console.warn("Pinata JWT not set, skipping real upload");
                return "Qm_mock_cid_pinata_not_set";
            }

            const upload = await this.pinata.upload.json(data);
            console.log(`Uploaded to IPFS: ${upload.IpfsHash}`);
            return upload.IpfsHash;
        } catch (error) {
            console.error("Failed to upload to IPFS:", error);
            throw new Error("IPFS upload failed");
        }
    }

    getGatewayUrl(cid: string): string {
        return `https://${this.gateway}/ipfs/${cid}`;
    }

    async uploadFile(buffer: Buffer, fileName: string, mimeType: string, retries = 3): Promise<string> {
        if (this.jwt === "mock_jwt") {
            console.warn("Pinata JWT not set, skipping real file upload");
            return "Qm_mock_file_cid_pinata_not_set";
        }

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
