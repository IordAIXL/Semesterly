#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(root, "agents", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const [command = "help", agentId, ...taskParts] = process.argv.slice(2);
const task = taskParts.join(" ").trim();

function agentById(id) {
  return manifest.agents.find((agent) => agent.id === id);
}

function readAgent(agent) {
  return readFileSync(join(root, agent.brief), "utf8");
}

function printHelp() {
  console.log(`Semesterly agent tools\n\nCommands:\n  node scripts/agent-tools.mjs list\n  node scripts/agent-tools.mjs brief <agent-id>\n  node scripts/agent-tools.mjs prompt <agent-id> "task"\n  node scripts/agent-tools.mjs workflow <workflow-id>\n  node scripts/agent-tools.mjs check\n\nAgent ids:\n${manifest.agents.map((agent) => `  - ${agent.id}`).join("\n")}\n`);
}

function printList() {
  for (const agent of manifest.agents) {
    console.log(`${agent.id}`);
    console.log(`  Owns: ${agent.owns.join(", ")}`);
    console.log(`  Best for: ${agent.bestFor}`);
    console.log(`  Brief: ${agent.brief}`);
  }
}

function printBrief(id) {
  const agent = agentById(id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  console.log(readAgent(agent));
}

function printPrompt(id, taskText) {
  const agent = agentById(id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  const brief = readAgent(agent).trim();
  const files = agent.defaultFiles.map((file) => `- ${file}`).join("\n");
  const validation = (agent.validation ?? []).map((command) => `- ${command}`).join("\n");
  console.log(`# Semesterly agent prompt: ${agent.id}\n\n${brief}\n\n## Assigned task\n${taskText || "Audit your area and return the highest-value next actions."}\n\n## Repo files to inspect first\n${files}\n\n## Validation for this agent\n${validation}\n\n## Hard constraints\n- Work inside the Semesterly repo only.\n- Keep output concise and actionable.\n- If implementing, state exact files changed and run validation.\n- End with Ship / Fix next / Blocked by.\n`);
}

function printWorkflow(id) {
  const workflow = manifest.workflows.find((item) => item.id === id);
  if (!workflow) throw new Error(`Unknown workflow: ${id}`);
  console.log(`${workflow.id}: ${workflow.goal}\n`);
  workflow.steps.forEach((step, index) => {
    const agent = agentById(step);
    console.log(`${index + 1}. ${step} — ${agent.bestFor}`);
    console.log(`   Prompt: node scripts/agent-tools.mjs prompt ${step} "<focused task>"`);
  });
}

function pathExists(relativePath) {
  return existsSync(join(root, relativePath));
}

function check() {
  const failures = [];
  if (!existsSync(manifestPath)) failures.push("agents/manifest.json missing");
  for (const agent of manifest.agents) {
    const briefPath = join(root, agent.brief);
    if (!existsSync(briefPath)) {
      failures.push(`${agent.brief} missing`);
      continue;
    }
    const content = readFileSync(briefPath, "utf8");
    if (!content.includes("Ship / Fix next / Blocked by")) failures.push(`${agent.brief} missing required report ending`);
    if (!Array.isArray(agent.defaultFiles) || agent.defaultFiles.length < 2) {
      failures.push(`${agent.id} needs defaultFiles`);
    } else {
      for (const file of agent.defaultFiles) {
        if (!pathExists(file)) failures.push(`${agent.id} default file missing: ${file}`);
      }
    }
    if (!Array.isArray(agent.validation) || agent.validation.length === 0) failures.push(`${agent.id} needs validation commands`);
  }
  for (const workflow of manifest.workflows) {
    for (const step of workflow.steps) {
      if (!agentById(step)) failures.push(`${workflow.id} references missing agent ${step}`);
    }
  }
  if (failures.length) {
    console.error("Agent tool check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Agent tool check passed: ${manifest.agents.length} agents, ${manifest.workflows.length} workflows.`);
}

try {
  if (command === "help") printHelp();
  else if (command === "list") printList();
  else if (command === "brief") printBrief(agentId);
  else if (command === "prompt") printPrompt(agentId, task);
  else if (command === "workflow") printWorkflow(agentId);
  else if (command === "check") check();
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
