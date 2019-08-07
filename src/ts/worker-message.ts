export const enum WorkerMessageType {
  NotifyState,
  RunCounter,
  CancelCounter
}

export interface WorkerMessage {
  type: WorkerMessageType;
  data?: any;
}
