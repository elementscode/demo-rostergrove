import { App } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import signin from "#app/pages/signin";
import signup from "#app/pages/signup";
import admin from "#app/pages/admin";
import adminShift from "#app/pages/admin-shift";
import adminNew from "#app/pages/admin-new";
import hoursCsv from "#app/pages/admin/hours-csv";
import { SendShiftRemindersJob } from "#app/jobs/send-shift-reminders";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/signup", signup);
app.route("/admin", admin);
app.route("/admin/new", adminNew);
app.route("/admin/hours.csv", hoursCsv);
app.route("/admin/shifts/:id", adminShift);

// Hourly, so a shift added or picked up late still gets its reminder. The job
// only sends for tomorrow's shifts and marks each signup once it is sent.
app.cron("every 1h", "shift reminders", () => new SendShiftRemindersJob({}).schedule());

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
