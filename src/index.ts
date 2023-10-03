import { getAsyncLifecycle, defineConfigSchema } from "@openmrs/esm-framework";
import { configSchema } from "./config-schema";

const moduleName = "@openmrs/esm-draw-app";

const options = {
  featureName: "draw",
  moduleName: "@openmrs/esm-draw-app",
};

export const importTranslation = require.context(
  "../translations",
  false,
  /.json$/,
  "lazy"
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const DrawPage = getAsyncLifecycle(
  () => import("./draw-page.component"),
  options
);
