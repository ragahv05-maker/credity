import { create } from "zustand";

export interface Record {
  id: string;
  credentialId?: string; // Actual credential UUID from backend
  name: string;
  credential: string;
  date: string;
  status: "Issued" | "Revoked" | "Pending";
  issuer: string;
  department?: string;
  txHash?: string;
}

interface AppState {
  records: Record[];
  addRecord: (record: Record) => void;
  revokeRecord: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  records: [], // No mock data - real credentials come from API
  addRecord: (record: Record) =>
    set((state: AppState) => ({ records: [record, ...state.records] })),
  revokeRecord: (id: string) =>
    set((state: AppState) => ({
      records: state.records.map((r: Record) =>
        r.id === id ? { ...r, status: "Revoked" } : r,
      ),
    })),
}));
