import { serve } from "@daloyjs/core/node";
import { buildMcpApp } from "./build-mcp-app.ts";

const app = buildMcpApp();
const port = Number(process.env.MCP_PORT ?? 3001);
serve(app, { port });
console.log(`orders-api MCP listening on http://127.0.0.1:${port}/mcp`);
