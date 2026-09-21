import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In Azure the React build is copied into the same container as the API.
// Keeping frontend and backend same-origin removes the need for a second
// sandbox resource and lets Container Apps authentication protect both.
const staticDir = process.env.STATIC_DIR ?? path.resolve(process.cwd(), "public");

app.use(express.static(staticDir));

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    next();
    return;
  }

  if (!req.accepts("html")) {
    next();
    return;
  }

  res.sendFile(path.join(staticDir, "index.html"));
});

export default app;
