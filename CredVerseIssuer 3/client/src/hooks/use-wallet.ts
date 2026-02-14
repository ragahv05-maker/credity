import { useState, useEffect, useCallback } from 'react';

declare global {
    interface Window {
        ethereum?: any;
    }
}

export interface WalletState {
    isConnected: boolean;
    isConnecting: boolean;
    address: string | null;
    chainId: number | null;
    error: string | null;
}

const CHAIN_NAMES: Record<number, string> = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
    56: 'BSC Mainnet',
    97: 'BSC Testnet',
};

export function useWallet() {
    const [state, setState] = useState<WalletState>({
        isConnected: false,
        isConnecting: false,
        address: null,
        chainId: null,
        error: null,
    });

    // Check if MetaMask is installed
    const isMetaMaskInstalled = useCallback(() => {
        return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
    }, []);

    // Format address for display
    const formatAddress = useCallback((address: string) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }, []);

    // Get chain name
    const getChainName = useCallback((chainId: number | null) => {
        if (!chainId) return 'Unknown';
        return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
    }, []);

    // Connect wallet
    const connect = useCallback(async () => {
        if (!isMetaMaskInstalled()) {
            window.open('https://metamask.io/download/', '_blank');
            setState(s => ({ ...s, error: 'Please install MetaMask to connect' }));
            return;
        }

        setState(s => ({ ...s, isConnecting: true, error: null }));

        try {
            // Request accounts
            const accounts = await window.ethereum!.request({
                method: 'eth_requestAccounts',
            });

            // Get chain ID
            const chainIdHex = await window.ethereum!.request({
                method: 'eth_chainId',
            });
            const chainId = parseInt(chainIdHex, 16);

            if (accounts && accounts.length > 0) {
                setState({
                    isConnected: true,
                    isConnecting: false,
                    address: accounts[0],
                    chainId,
                    error: null,
                });

                // Store connection in localStorage
                localStorage.setItem('walletConnected', 'true');
                localStorage.setItem('walletAddress', accounts[0]);
            }
        } catch (error: any) {
            let errorMessage = 'Failed to connect wallet';
            if (error.code === 4001) {
                errorMessage = 'Connection rejected by user';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setState(s => ({
                ...s,
                isConnecting: false,
                error: errorMessage,
            }));
        }
    }, [isMetaMaskInstalled]);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        setState({
            isConnected: false,
            isConnecting: false,
            address: null,
            chainId: null,
            error: null,
        });
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
    }, []);

    // Handle account changes
    const handleAccountsChanged = useCallback((accounts: string[]) => {
        if (accounts.length === 0) {
            disconnect();
        } else {
            setState(s => ({ ...s, address: accounts[0] }));
            localStorage.setItem('walletAddress', accounts[0]);
        }
    }, [disconnect]);

    // Handle chain changes
    const handleChainChanged = useCallback((chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        setState(s => ({ ...s, chainId }));
    }, []);

    // Auto-connect on mount if previously connected
    useEffect(() => {
        const wasConnected = localStorage.getItem('walletConnected') === 'true';

        if (wasConnected && isMetaMaskInstalled()) {
            // Check if still connected
            window.ethereum!.request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts.length > 0) {
                        window.ethereum!.request({ method: 'eth_chainId' })
                            .then((chainIdHex: string) => {
                                setState({
                                    isConnected: true,
                                    isConnecting: false,
                                    address: accounts[0],
                                    chainId: parseInt(chainIdHex, 16),
                                    error: null,
                                });
                            });
                    } else {
                        disconnect();
                    }
                });
        }
    }, [isMetaMaskInstalled, disconnect]);

    // Set up event listeners
    useEffect(() => {
        if (!isMetaMaskInstalled()) return;

        window.ethereum!.on('accountsChanged', handleAccountsChanged);
        window.ethereum!.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum!.removeListener('chainChanged', handleChainChanged);
        };
    }, [isMetaMaskInstalled, handleAccountsChanged, handleChainChanged]);

    return {
        ...state,
        connect,
        disconnect,
        formatAddress,
        getChainName,
        isMetaMaskInstalled: isMetaMaskInstalled(),
    };
}
