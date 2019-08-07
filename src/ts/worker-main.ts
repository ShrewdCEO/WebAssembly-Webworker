import { WorkerMessage, WorkerMessageType } from "./worker-message";

let task: Module.Task | undefined;

function ensureTaskInitialized() {
  if (!task) {
    console.log("Initializing task...");
    task = new Module.CounterTask();
  }
}

function handleMessages(ev: MessageEvent) {
  const msg = ev.data as WorkerMessage;
  console.log("Message from main:", msg);

  switch (msg.type) {
    case WorkerMessageType.RunCounter: {
      ensureTaskInitialized();

      if (!task!.isRunning) {
        task!.run();
      }
      break;
    }

    case WorkerMessageType.CancelCounter: {
      ensureTaskInitialized();

      if (task!.isRunning) {
        task!.cancel();
      }
      break;
    }
  }
}

self.addEventListener("message", ev => {});

self.onmessage = function(e) {
  handleMessages(e);
};

self.onerror = function(e) {
  console.error("Worker.onerror:", e);
};
