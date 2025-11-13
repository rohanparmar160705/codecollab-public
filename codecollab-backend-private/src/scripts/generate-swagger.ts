// src/scripts/generate-swagger.ts
import { generateSwaggerJson } from "../config/swagger";

(async () => {
  generateSwaggerJson();
  // eslint-disable-next-line no-console
  console.log("Swagger spec generated at src/docs/swagger-output.json");
})();
