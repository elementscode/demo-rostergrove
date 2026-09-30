/**
 * Sends tomorrow's shift reminders now, instead of waiting for the hourly cron:
 *
 *   elements run scripts/send-reminders.ts
 */
import { Services } from "@elements/app";
import config from "#config";
import { SendShiftRemindersJob, dueReminders } from "#app/jobs/send-shift-reminders";

Services.start(config);

function main() {
  let due = dueReminders().length;
  new SendShiftRemindersJob({}).run();
  console.log(`sent ${due} reminder${due === 1 ? "" : "s"}`);
  process.exit(0);
}

main();
