declare namespace Module {
  interface Task {
    state: any;
    isCanceled: boolean;
    isRunning: boolean;
    run(): void;
    cancel(): void;
  }

  class CounterTask implements Task {
    constructor();
    state: any;
    isCanceled: boolean;
    isRunning: boolean;
    run(): void;
    cancel(): void;
  }
}
