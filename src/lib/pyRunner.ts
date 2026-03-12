type PyRunResult = {
  stdout: string;
  stderr: string;
};

type LoadPyodide = (options: { indexURL: string }) => Promise<PyodideLike>;

type PyodideLike = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched?: (output: string) => void }) => void;
  setStderr: (options: { batched?: (output: string) => void }) => void;
};

let pyodidePromise: Promise<PyodideLike> | null = null;

function getIndexURL(): string {
  const explicit = process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL;
  if (explicit) return explicit.endsWith("/") ? explicit : `${explicit}/`;

  const version = process.env.NEXT_PUBLIC_PYODIDE_VERSION ?? "0.29.3";
  return `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;
}

function loadPyodideScript(indexURL: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Pyodide can only be loaded in a browser environment."),
    );
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-pyodide-index-url="${indexURL}"]`,
  );
  if (existing) {
    if ((window as Window & { loadPyodide?: LoadPyodide }).loadPyodide) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Pyodide script.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${indexURL}pyodide.js`;
    script.async = true;
    script.dataset.pyodideIndexUrl = indexURL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pyodide script."));
    document.head.appendChild(script);
  });
}

async function getPyodideInstance(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const indexURL = getIndexURL();
      await loadPyodideScript(indexURL);

      const loadPyodide = (window as Window & { loadPyodide?: LoadPyodide })
        .loadPyodide;

      if (!loadPyodide) {
        throw new Error("Pyodide loader was not found on window.");
      }

      return loadPyodide({ indexURL });
    })();
  }
  return pyodidePromise;
}

export async function runPython(code: string): Promise<PyRunResult> {
  let pyodide: PyodideLike;
  try {
    pyodide = await getPyodideInstance();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      stdout: "",
      stderr: `Failed to load Pyodide runtime.\n${message}`,
    };
  }

  let stdout = "";
  let stderr = "";

  pyodide.setStdout({
    batched: (output: string) => {
      stdout += output.endsWith("\n") ? output : `${output}\n`;
    },
  });

  pyodide.setStderr({
    batched: (output: string) => {
      stderr += output.endsWith("\n") ? output : `${output}\n`;
    },
  });

  try {
    await pyodide.runPythonAsync(code);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr += message.endsWith("\n") ? message : `${message}\n`;
  }

  return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd() };
}
