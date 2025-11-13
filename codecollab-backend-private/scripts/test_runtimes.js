/*
 Simple runtime sanity check that runs "hello" programs inside each compiler image.
 Ensures each Docker runtime (Node, Python, C++, Java) executes basic commands correctly.
 Usage: node scripts/test_runtimes.js
*/

require("dotenv").config();
const { exec } = require("child_process");

function sh(cmd, opts = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    exec(cmd, { timeout: 15000, ...opts }, (err, stdout, stderr) => {
      resolve({
        err,
        stdout: stdout || "",
        stderr: stderr || "",
        ms: Date.now() - started,
        cmd,
      });
    });
  });
}

function printResult(name, res) {
  console.log(`\n=== ${name} ===`);
  console.log("CMD :", res.cmd);
  console.log("MS  :", res.ms);
  console.log("EXIT:", res.err ? res.err.code : 0);
  console.log("STDOUT:\n", (res.stdout || "").slice(0, 500));
  console.log("STDERR:\n", (res.stderr || "").slice(0, 500));
}

// Escape code for base64 encoding to avoid shell escaping issues
function encodeCode(str) {
  return Buffer.from(str).toString('base64');
}

(async () => {
  const images = {
    node: process.env.DOCKER_IMAGE_NODE,
    python: process.env.DOCKER_IMAGE_PYTHON,
    cpp: process.env.DOCKER_IMAGE_CPP,
    java: process.env.DOCKER_IMAGE_JAVA,
  };

  console.log("Using images:", images);

  // ---------- Node ----------
  if (images.node) {
    const ok = `docker run --rm --entrypoint "" --network=none --cpus=0.5 -m 256m ${images.node} node -e "console.log('hello-node')"`;
    const bad = `docker run --rm --entrypoint "" --network=none ${images.node} node -e "consol.log('oops-node')"`; // typo: consol
    printResult("Node ✅ Success", await sh(ok));
    printResult("Node ❌ Error", await sh(bad));
  }

  // ---------- Python ----------
  if (images.python) {
    const ok = `docker run --rm --entrypoint "" --network=none ${images.python} python3 -c "print('hello-python')"`;
    const bad = `docker run --rm --entrypoint "" --network=none ${images.python} python3 -c "prin('oops-python')"`; // typo: prin
    printResult("Python ✅ Success", await sh(ok));
    printResult("Python ❌ Error", await sh(bad));
  }

  // ---------- C++ ----------
  if (images.cpp) {
    const okCode = `#include <iostream>
int main() {
    std::cout << "hello-cpp";
    return 0;
}`;
    const badCode = `#include <iostream>
int main() {
    std::cout << hello_cpp;
    return 0;
}`;
    const okEncoded = encodeCode(okCode);
    const badEncoded = encodeCode(badCode);
    
    const ok = `docker run --rm --entrypoint "" --network=none ${images.cpp} sh -c "echo '${okEncoded}' | base64 -d > /app/main.cpp && g++ /app/main.cpp -o /app/a.out && /app/a.out"`;
    const bad = `docker run --rm --entrypoint "" --network=none ${images.cpp} sh -c "echo '${badEncoded}' | base64 -d > /app/main.cpp && g++ /app/main.cpp -o /app/a.out && /app/a.out"`;
    printResult("C++ ✅ Success", await sh(ok));
    printResult("C++ ❌ Error", await sh(bad));
  }

  // ---------- Java ----------
  if (images.java) {
    const okCode = `public class Main {
    public static void main(String[] args) {
        System.out.print("hello-java");
    }
}`;
    const badCode = `public class Main {
    public static void main(String[] args) {
        System.oot.print("oops-java");
    }
}`;
    const okEncoded = encodeCode(okCode);
    const badEncoded = encodeCode(badCode);
    
    const ok = `docker run --rm --entrypoint "" --network=none ${images.java} sh -c "echo '${okEncoded}' | base64 -d > /app/Main.java && javac /app/Main.java && java -cp /app Main"`;
    const bad = `docker run --rm --entrypoint "" --network=none ${images.java} sh -c "echo '${badEncoded}' | base64 -d > /app/Main.java && javac /app/Main.java && java -cp /app Main"`;
    printResult("Java ✅ Success", await sh(ok));
    printResult("Java ❌ Error", await sh(bad));
  }

  console.log(
    "\n✅ Done. If 'Success' tests print hello-* and 'Error' tests show compile/runtime errors, all runtimes are healthy."
  );
})();
