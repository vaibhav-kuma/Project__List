import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: false,
    video: false,
    env: {
      apiBaseUrl: "http://localhost:4000"
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
