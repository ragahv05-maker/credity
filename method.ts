    /**
     * Batch store credentials
     */
    async storeCredentials(
        userId: number,
        credentials: {
            type: string[];
            issuer: string;
            issuanceDate: Date;
            expirationDate?: Date;
            data: any;
            jwt?: string;
            category?: string;
        }[]
    ): Promise<any[]> {
        const wallet = await this.getOrCreateWallet(userId);
        const storedCredentials: any[] = [];

        for (const credential of credentials) {
            const encryptedData = this.encrypt(JSON.stringify(credential.data));
            const hash = this.hashCredential(credential.data);

            const storedCredential = {
                id: `cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: credential.type,
                issuer: credential.issuer,
                issuanceDate: credential.issuanceDate,
                expirationDate: credential.expirationDate,
                data: credential.data,
                jwt: credential.jwt,
                encryptedData,
                hash,
                anchorStatus: 'pending',
                category: (credential.category as any) || 'other',
                verificationCount: 0,
            };

            // @ts-ignore
            wallet.credentials.push(storedCredential);
            storedCredentials.push(storedCredential);
        }

        await queuePersist();
        return storedCredentials;
    }
}

export const walletService = new WalletService();
