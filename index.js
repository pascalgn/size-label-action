#!/usr/bin/env node

const fs = require("fs");
const process = require("process");

const Octokit = require("@octokit/rest");
const Diff = require("diff");

const sizes = {
  0: "XS",
  10: "S",
  30: "M",
  100: "L",
  500: "XL",
  1000: "XXL"
};

const actions = ["opened", "synchronize"];

async function main() {
  debug("Running size-label-action...");

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    throw new Error("Environment variable GITHUB_TOKEN not set!");
  }

  const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;
  if (!GITHUB_EVENT_PATH) {
    throw new Error("Environment variable GITHUB_EVENT_PATH not set!");
  }

  const eventDataStr = await readFile(GITHUB_EVENT_PATH);
  const eventData = JSON.parse(eventDataStr);

  if (!eventData || !eventData.pull_request || !eventData.pull_request.head) {
    throw new Error(`Invalid GITHUB_EVENT_PATH contents: ${eventDataStr}`);
  }

  debug("Event payload:", eventDataStr);

  if (!actions.includes(eventData.action)) {
    return;
  }

  const pullRequestId = {
    owner: eventData.pull_request.head.repo.owner.login,
    repo: eventData.pull_request.head.repo.name,
    number: eventData.pull_request.number
  };

  const octokit = new Octokit({
    auth: `token ${GITHUB_TOKEN}`
  });

  const pullRequestDiff = await octokit.pulls.get({
    ...pullRequestId,
    headers: {
      accept: "application/vnd.github.v3.diff"
    }
  });

  const changedLines = getChangedLines(pullRequestDiff.data);
  debug("Changed lines:", changedLines);

  const sizeLabel = getSizeLabel(changedLines);
  debug("Matching label:", sizeLabel);

  const { add, remove } = getLabelChanges(
    sizeLabel,
    eventData.pull_request.labels
  );

  if (add.length > 0) {
    debug("Adding labels:", add);
    await octokit.issues.addLabels({ ...pullRequestId, labels: add });
  }

  for (const label of remove) {
    debug("Removing label:", label);
    await octokit.issues.removeLabel({ ...pullRequestId, name: label });
  }

  debug("Success!");
}

function debug(...str) {
  if (process.env.DEBUG_ACTION) {
    console.log.apply(console, str);
  }
}

async function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, { encoding: "utf8" }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function getChangedLines(diff) {
  return Diff.parsePatch(diff)
    .flatMap(file => file.hunks)
    .flatMap(hunk => hunk.lines)
    .filter(line => line[0] === "+" || line[0] === "-").length;
}

function getSizeLabel(changedLines) {
  let label = null;
  for (const lines of Object.keys(sizes).sort()) {
    if (changedLines > lines) {
      label = `size/${sizes[lines]}`;
    }
  }
  return label;
}

function getLabelChanges(newLabel, existingLabels) {
  const add = [newLabel];
  const remove = [];
  for (const existingLabel of existingLabels) {
    const { name } = existingLabel;
    if (name.startsWith("size/")) {
      if (name === newLabel) {
        add.pop();
      } else {
        remove.push(name);
      }
    }
  }
  return { add, remove };
}

if (require.main === module) {
  main().catch(e => {
    process.exitCode = 1;
    console.error(e);
  });
}

module.exports = { main };
