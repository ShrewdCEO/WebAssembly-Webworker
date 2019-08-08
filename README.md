# WebAssembly-Webworker

## Requirements

- Node.js and NPM
- Emscripten
- CMake
- Ninja

## Building

After cloning the repository, install NPM packages by following command:

```
$ npm install
```

To build project for development, run following command:

```
$ npm run build
```

To build project for production, run following command:

```
$ npm run publish
```

To clean build and output directories, run following command:

```
$ npm run clean
```

## How it works?

In WebAssembly, abstract [`Task`](src/cpp/task.h) class responsible for modifying and keeping state. Derived [`CounterTask`](src/cpp/module.cpp) class implements a simple task with an infinite loop. The loop will be terminated when `Task::IsCanceled()` returns `true`.

[`Task`](src/cpp/task.h) and [`CounterTask`](src/cpp/module.cpp) is exposed to JavaScript via Emscripten bindings. So, if can instantiate them and call their methods and properties.

Example usage:

```ts
const task = Module.CounterTask();

// To run task:
task.run();

// To cancel already running task:
task.cancel();

// Resume where it's left:
task.run();
```

[`Task`](src/cpp/task.h) is responsible for state propagation. It directly sends message to main script via inline JavaScript.

Web Worker initializes an instance of [`CounterTask`](src/cpp/module.cpp) class and calls required methods when it receives messages from main script. Web Worker keep the instance pointer till its termination. So, all states are kept.

## Important

It's important to synchronize [`WorkerMessageType`](src/cpp/worker.h) in C++ and [`WorkerMessageType`](src/ts/worker-message.ts) in TypeScript. So, that [`Task`](src/cpp/task.h) class can send correct message type.

Also, if you change the exposed members of C++ classes, you need to change [src/ts/types/module.d.ts](src/ts/types/module.d.ts) to reflect changes for TypeScript.

## Testing

You can test it at: https://flamboyant-tesla-26f5ed.netlify.com/
