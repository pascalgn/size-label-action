const fs = require("fs");
const process = require("process");

require("dotenv").config();

const tmp = require("tmp");
tmp.setGracefulCleanup();

const index = require("./dist/index");

async function main() {
  const eventPayloadPath = await tmpFile(
    JSON.stringify({
      action: "synchronize",
      pull_request: {
        number: process.env.PR_NUMBER,
        labels: [],
        base: {
          repo: {
            name: process.env.PR_NAME,
            owner: {
              login: process.env.PR_OWNER
            }
          }
        }
      }
    })
  );

  process.env.DEBUG_ACTION = "1";
  process.env.GITHUB_EVENT_PATH = eventPayloadPath;

  await index.main();
}

function tmpFile(content) {
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: ".json" }, (err, path) => {
      if (err) {
        reject(err);
      } else {
        fs.writeFile(path, content, err => {
          if (err) {
            reject(err);
          } else {
            resolve(path);
          }
        });
      }
    });
  });
}

main().catch(e => {
  process.exitCode = 1;
  console.error(e);
});
