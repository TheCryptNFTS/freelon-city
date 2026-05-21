// Global window.ethereum declaration — shared by useHolder + WalletConnect.
export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
};
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
