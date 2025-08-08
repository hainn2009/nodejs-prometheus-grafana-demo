const express = require("express");
const axios = require("axios");
const client = require("prom-client");

const app = express();
const port = 3000;

// Tạo Registry Prometheus
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Metric tuỳ chỉnh cho health check
const healthGauge = new client.Gauge({
  name: "app_health_status",
  help: "Health status of the app (1=up, 0=down)",
  labelNames: ["service"]
});
register.registerMetric(healthGauge);

// Hàm kiểm tra một API cụ thể
async function checkExternalAPI() {
  try {
    const res = await axios.get("https://jsonplaceholder.typicode.com/posts/1");
    return res.status === 200;
  } catch {
    return false;
  }
}

// Route health tổng quát
app.get("/health", async (req, res) => {
  const externalAPI = await checkExternalAPI();

  // Cập nhật metric
  healthGauge.set({ service: "external_api" }, externalAPI ? 1 : 0);

  const status = externalAPI ? "UP" : "DOWN";
  res.status(externalAPI ? 200 : 503).json({
    status,
    services: {
      externalAPI: status
    }
  });
});

// Endpoint metrics cho Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`Node app listening at http://localhost:${port}`);
});
