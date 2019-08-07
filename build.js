const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const fsExtra = require("fs-extra");
const webpack = require("webpack");
const argv = require("minimist")(process.argv.slice(2));

function isBuildFlagSet(flag) {
  return argv && argv[flag];
}

function getBuildMode() {
  return isBuildFlagSet("production") ? "production" : "development";
}

function directoryExists(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (e) {
    if (e.code == "ENOENT") {
      // no such file or directory. File really does not exist
      return false;
    }

    console.log("Exception fs.statSync (" + path + "): " + e);
    throw e; // something else went wrong, we don't have rights, ...
  }
}

async function createDirectoryAsync(path) {
  if (!directoryExists(path)) {
    await fsExtra.mkdirs(path);
  }
}

function spawnAsync(cmd, args, options) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, options);
    proc.stdout.on("data", chunk => {
      console.log(chunk.toString());
    });
    proc.stderr.on("data", chunk => {
      console.error(chunk.toString());
    });
    proc.on("error", reject).on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

function copyAsync(source, target) {
  console.log(`Copying: "${source}" --> "${target}"`);
  return new Promise((resolve, reject) => {
    fsExtra.copy(source, target, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function removeAsync(directory) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(directory)) {
      resolve();
      return;
    }

    fsExtra.remove(directory, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function cleanBuildDirectoriesAsync() {
  console.log("Cleaning build directories...");
  await removeAsync("./bin");
  await removeAsync("./build");
}

async function createBuildDirectoriesAsync() {
  console.log("Creating build directory...");
  await createDirectoryAsync("./bin");
  await createDirectoryAsync("./build");
  await createDirectoryAsync("./build/wasm");
}

async function copyStaticFilesAsync() {
  const promises = [await copyAsync("./src/html", "./bin")];

  await Promise.all(promises);
}

function compileWithWebpackAsync(entry, bundle) {
  const outputPath = path.resolve(__dirname, "build/js");

  console.log("Compiling: ", entry);
  return new Promise((resolve, reject) => {
    const config = {
      mode: getBuildMode(),
      entry: entry,
      devtool: "source-map",
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/
          },
          {
            test: /\.scss$/,
            use: [
              { loader: "style-loader" },
              { loader: "css-loader" },
              { loader: "sass-loader" }
            ]
          }
        ]
      },
      resolve: {
        extensions: [".tsx", ".ts", ".js"]
      },
      output: {
        filename: bundle,
        path: outputPath
      }
    };

    const compiler = webpack(config);

    compiler.run((compileError, stats) => {
      if (compileError) {
        reject(compileError);
        return;
      }

      const jsonStats = stats.toJson({
        modules: false,
        chunks: false
      });

      console.info(
        stats.toString({
          chunks: false,
          colors: true
        }) + "\n"
      );

      resolve([
        path.resolve(outputPath, bundle),
        path.resolve(outputPath, bundle + ".map")
      ]);
    });
  });
}

async function compileScriptAsync(sourcePath, targetFileName) {
  const outputFileArray = await compileWithWebpackAsync(
    sourcePath,
    targetFileName
  );
  const outputPath = path.resolve(__dirname, "bin/js");

  const promises = [];
  for (const outputFile of outputFileArray) {
    const fileName = path.basename(outputFile);
    promises.push(copyAsync(outputFile, path.resolve(outputPath, fileName)));
  }

  await Promise.all(promises);
}

async function compileWorkerScriptAsync() {
  await compileScriptAsync("./src/ts/worker.ts", "worker.js");
  await compileScriptAsync("./src/ts/worker-main.ts", "worker-main.js");
}

async function compileMainScriptAsync() {
  return compileScriptAsync("./src/ts/main.ts", "main.js");
}

async function compileWasmAsync() {
  const targetDir = path.resolve(__dirname, "bin/js");
  const buildDir = path.resolve(__dirname, "build/wasm");
  const buildOptions = {
    cwd: buildDir
  };

  const emscriptenPath = process.env.EMSCRIPTEN;
  if (!emscriptenPath || !fsExtra.existsSync(emscriptenPath)) {
    throw new Error("Emscripten path seems uninitialized.");
  }

  const toolchainPath = path.resolve(
    emscriptenPath,
    "cmake/Modules/Platform/Emscripten.cmake"
  );
  console.log("Emscripten Path:", emscriptenPath);
  console.log("Emscripten Toolchain:", toolchainPath);

  const cmakeArgs = [
    `-DCMAKE_TOOLCHAIN_FILE=${toolchainPath}`,
    "-DCMAKE_BUILD_TYPE=Release",
    "-G",
    "Ninja",
    "../.."
  ];

  await spawnAsync("cmake", cmakeArgs, buildOptions);
  await spawnAsync("ninja", [], buildOptions);
  await copyAsync(
    path.resolve(buildDir, "module.js"),
    path.resolve(targetDir, "module.js")
  );
  await copyAsync(
    path.resolve(buildDir, "module.wasm"),
    path.resolve(targetDir, "module.wasm")
  );
}

async function buildAsync() {
  if (isBuildFlagSet("clean")) {
    await cleanBuildDirectoriesAsync();
  }

  if (isBuildFlagSet("build")) {
    const isRelease = isBuildFlagSet("production");
    await copyStaticFilesAsync();
    await createBuildDirectoriesAsync();
    await compileWasmAsync(isRelease ? "Release" : "Debug");
    await compileWorkerScriptAsync();
    await compileMainScriptAsync();
  }
}

console.time("build");

buildAsync()
  .then(() => {
    console.timeEnd("build");
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
