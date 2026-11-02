import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourcePath = fileURLToPath(new URL("../lib/screen-parity.ts", import.meta.url));
const liveExportFolders = [
  "agenda_speaker_planner",
  "annual_gathering_hub",
  "create_gathering_wizard",
  "initiative_details",
  "initiative_hub",
  "propose_new_initiative",
  "rsvp_attendee_management"
];

test("live Events and Initiatives parity records do not regress to fixtures", async () => {
  const source = await readFile(sourcePath, "utf8");
  const records = source
    .slice(source.indexOf("export const screenParityRecords"))
    .split("\n  {");

  for (const exportFolder of liveExportFolders) {
    const record = records.find((entry) => entry.includes(`exportFolder: "${exportFolder}"`));

    assert.ok(record, `missing parity record for ${exportFolder}`);
    assert.match(record, /backendDependencyStatus: "implemented"/);
    assert.match(record, /dataSource: "live API"/);
    assert.match(record, /status: "live route"/);
  }
});
