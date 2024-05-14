const express = require("express");
const responseTime = require("response-time");
const client = require("prom-client");
const { createLogger, transports } = require("winston");
const LokiTransport = require("winston-loki");
const options = {
  transports: [
    new LokiTransport({
      host: "http://127.0.0.1:3100",
    }),
  ],
};
const logger = createLogger(options);
const app = express();
const PORT = process.env.PORT || 8000;

//start collecting default metrics
client.collectDefaultMetrics();

const reqResTime = new client.Histogram({
  name: "http_express_req_res_time",
  help: "This will tell how much time is take by req and res",
  labelNames: ["method", "route", "status_code"],
  buckets: [1, 50, 100, 200, 400, 500, 800, 1000, 2000],
});

const totalReqCounter = new client.Counter({
  name: "total_req",
  help: "Tells total req",
});

app.use(
  responseTime((req, res, time) => {
    reqResTime
      .labels({
        method: req.method,
        route: req.url,
        status_code: res.statusCode,
      })
      .observe(time);
  })
);

app.get("/", (req, res) => {
  logger.info("Req came to / get");
  totalReqCounter.inc();
  res.send("Basic React Application");
});

app.get("/metrics", async (req, res) => {
  logger.info("Req came to / use");
  totalReqCounter.inc();
  res.setHeader("Content-Type", client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

app.get("/exit", (req, res) => {
  logger.info("Req came to / info");
  totalReqCounter.inc();
  res.send("Server stopped");
  process.exit(0); // This stops the server (not recommended in production)
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
