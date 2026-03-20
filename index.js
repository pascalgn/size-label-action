#!/usr/bin/env node

import { writeFileSync, readFile } from "fs";
import process, { env } from "process";
import url from "url";

import { Octokit } from "@octokit/rest";
import globrex from "globrex";

import { HttpsProxyAgent } from "https-proxy-agent";

const defaultSizes = {
  0: "XS",
  10: "S",
  30: "M",
  100: "L",
  500: "XL",
  1000: "XXL"
};

const actions = ["opened", "synchronize", "reopened"];

const globrexOptions = { extended: true, globstar: true };

export async function main() {
  debug("Running size-label-action...");

  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    throw new Error("Environment variable GITHUB_TOKEN not set!");
  }

  const GITHUB_EVENT_PATH = env.GITHUB_EVENT_PATH;
  if (!GITHUB_EVENT_PATH) {
    throw new Error("Environment variable GITHUB_EVENT_PATH not set!");
  }

  const eventDataStr = await readEventFile(GITHUB_EVENT_PATH);
  const eventData = JSON.parse(eventDataStr);

  if (!eventData || !eventData.pull_request || !eventData.pull_request.base) {
    throw new Error(`Invalid GITHUB_EVENT_PATH contents: ${eventDataStr}`);
  }

  debug("Event payload:", eventDataStr);

  if (!actions.includes(eventData.action)) {
    console.log("Action will be ignored:", eventData.action);
    return false;
  }

  const isIgnored = parseIgnored(env.IGNORED);

  const pullRequestHome = {
    owner: eventData.pull_request.base.repo.owner.login,
    repo: eventData.pull_request.base.repo.name
  };

  const pull_number = eventData.pull_request.number;

  const proxyUrl = env.HTTPS_PROXY || env.https_proxy;

  const octokit = new Octokit({
    auth: `token ${GITHUB_TOKEN}`,
    baseUrl: env.GITHUB_API_URL || "https://api.github.com",
    userAgent: "pascalgn/size-label-action",
    ...(proxyUrl && { request: { agent: new HttpsProxyAgent(proxyUrl) } })
  });

  const pullRequestFiles = await octokit.pulls.listFiles({
    ...pullRequestHome,
    pull_number,
    headers: {
      accept: "application/vnd.github.raw+json"
    }
  });

  const changedLines = getChangedLines(isIgnored, pullRequestFiles.data);
  console.log("Changed lines:", changedLines);

  if (isNaN(changedLines)) {
    throw new Error(`could not get changed lines: '${changedLines}'`);
  }

  const sizes = getSizesInput();
  const sizeLabel = getSizeLabel(changedLines, sizes);
  console.log("Matching label:", sizeLabel);

  const githubOutput = env.GITHUB_OUTPUT;
  if (githubOutput) {
    writeFileSync(githubOutput, `sizeLabel="${sizeLabel}"`);
    debug(`Written label '${sizeLabel}' to ${githubOutput}`);
  }

  const { add, remove } = getLabelChanges(
    sizeLabel,
    eventData.pull_request.labels
  );

  if (add.length === 0 && remove.length === 0) {
    console.log("Correct label already assigned");
    return false;
  }

  if (add.length > 0) {
    debug("Adding labels:", add);
    await octokit.issues.addLabels({
      ...pullRequestHome,
      issue_number: pull_number,
      labels: add
    });
  }

  for (const label of remove) {
    debug("Removing label:", label);
    try {
      await octokit.issues.removeLabel({
        ...pullRequestHome,
        issue_number: pull_number,
        name: label
      });
    } catch (error) {
      debug("Ignoring removing label error:", error);
    }
  }

  debug("Success!");

  return true;
}

function debug(...str) {
  if (env.DEBUG_ACTION) {
    console.log.apply(console, str);
  }
}

// exported for testing
export function parseIgnored(str = "") {
  const ignored = (str || "")
    .split(/\r|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("#"))
    .map(s =>
      s.length > 1 && s[0] === "!"
        ? { not: globrex(s.slice(1), globrexOptions) }
        : globrex(s, globrexOptions)
    );
  function isIgnored(path) {
    if (path == null || path === "/dev/null") {
      return true;
    }
    let ignore = false;
    for (const entry of ignored) {
      if (entry.not) {
        if (path.match(entry.not.regex)) {
          return false;
        }
      } else if (!ignore && path.match(entry.regex)) {
        ignore = true;
      }
    }
    return ignore;
  }
  return isIgnored;
}

async function readEventFile(path) {
  return new Promise((resolve, reject) => {
    readFile(path, { encoding: "utf8" }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function getChangedLines(isIgnored, pullRequestFiles) {
  return pullRequestFiles
    .map(file =>
      isIgnored(file.previous_filename) && isIgnored(file.filename)
        ? 0
        : file.changes
    )
    .reduce((total, current) => total + current, 0);
}

function getSizeLabel(changedLines, sizes = defaultSizes) {
  let label = null;
  for (const lines of Object.keys(sizes).sort((a, b) => a - b)) {
    if (changedLines >= lines) {
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

function getSizesInput() {
  let inputSizes = env.INPUT_SIZES;
  if (inputSizes && inputSizes.length) {
    return JSON.parse(inputSizes);
  } else {
    return undefined;
  }
}

if (url.fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then(
    () => (process.exitCode = 0),
    e => {
      process.exitCode = 1;
      console.error(e);
    }
  );
}
