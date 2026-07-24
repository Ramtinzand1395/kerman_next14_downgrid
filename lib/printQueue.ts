export interface PrintJob {
  id: string;
  payload: Record<string, any>;
}

export const globalPrintQueue: PrintJob[] = [];
