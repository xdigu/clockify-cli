#!/usr/bin/env node
import { Command } from "commander";
import { runLogTimeFlow } from "@prompts/logTimeFlow";
import { runSetupWizard } from "@prompts/setupWizard";

const program = new Command();

program
  .name("clockfycli")
  .description("Interactive CLI to log time entries to Clockify")
  .version("0.1.0");

program
  .command("setup")
  .description("Configure API key and workspace")
  .option("--force", "Reconfigure even if config exists", false)
  .action(async (options: { force?: boolean }) => {
    try {
      await runSetupWizard(Boolean(options.force));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

program
  .command("log")
  .description("Log time entries interactively")
  .option("--date <date>", "Date to log (YYYY-MM-DD)")
  .option("--project-last", "Default to the last selected project for subsequent entries")
  .action(async (options: { date?: string; projectLast?: boolean }) => {
    try {
      await runLogTimeFlow({
        date: options.date,
        useLastProject: Boolean(options.projectLast),
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
