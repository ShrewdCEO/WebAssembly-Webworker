import { WorkerMessageType, WorkerMessage } from "./worker-message";

let worker: Worker | undefined;

function workerMessageHandler(ev: MessageEvent) {
  const msg = ev.data as WorkerMessage;
  console.log("Message from worker:", msg);

  switch (msg.type) {
    case WorkerMessageType.NotifyState:
      document.getElementById("state-text")!.innerText = msg.data;
      break;
  }
}

function runCounter() {
  if (!worker) {
    return;
  }

  worker.postMessage({
    type: WorkerMessageType.RunCounter
  } as WorkerMessage);
}

function cancelCounter() {
  if (!worker) {
    return;
  }

  worker.postMessage({
    type: WorkerMessageType.CancelCounter
  } as WorkerMessage);
}

function main() {
  worker = new Worker("/js/worker.js");
  worker.onmessage = ev => workerMessageHandler(ev);

  document.getElementById("start-button")!.addEventListener("click", ev => {
    runCounter();
  });

  document.getElementById("cancel-button")!.addEventListener("click", ev => {
    cancelCounter();
  });
}

document.addEventListener("DOMContentLoaded", (domEvent: any) => {
  main();
});
