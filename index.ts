import { Elysia, t } from "elysia"
import mongoose, { Schema, Document } from "mongoose"
import fetch from "node-fetch"
import chalk from "chalk"
import fs from "fs/promises"
import crypto from "crypto"
import { cors } from "@elysiajs/cors"
import HistoryModel from "./schema/historySchema"
import SecretKeyModel from "./schema/secretKeySchema"
import StatReportModel from "./schema/statReportSchema"
import logger from "./logger"

const PORT = Number(process.env.PORT) || 1933
const LOG_FILE = process.env.LOG_FILE || "./server.log"
const ALLOWED_REGIONS = (process.env.ALLOWED_REGIONS || "MM,sg,id").split(",")
const ALLOWED_CATEGORIES = (process.env.ALLOWED_CATEGORIES || "main,logdb,sidecar").split(",")
const PING_INTERVAL_MS = Number(process.env.PING_INTERVAL_MS || 10000)
const PING_TIMEOUT_MS = Number(process.env.PING_TIMEOUT_MS || 3000)
const PING_CONCURRENCY = Number(process.env.PING_CONCURRENCY || 10)
const CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : ["*"]

import DB_READY from "./database.init"

let pingInterval: NodeJS.Timeout | null = null

async function addHistory(payload: Partial<HistoryDoc>) {
  HistoryModel.create(payload).catch((e) => logger("error", "history write failed", e.message))
}

async function fetchWithTimeout(url: string, opts: any = {}, timeoutMs = PING_TIMEOUT_MS) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal })
    clearTimeout(id)
    return r
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('../logger').default;
dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
    
        logger.success(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.info(`Error: ${error.message}`);
        process.exit(1);
    }
}


module.exports = connectDB;
  } catch (e) {
    clearTimeout(id)
    throw e
  }
}

async function mapWithConcurrency<T>(items: T[], fn: (x: T) => Promise<any>, limit: number) {
  const out: any[] = []
  let i = 0
  const workers = Array.from({ length: limit }).map(async () => {
    while (i < items.length) {
      const idx = i++
      try {
        out[idx] = await fn(items[idx])
      } catch (e) {
        out[idx] = e
      }
    }
  })
  await Promise.all(workers)
  return out
}

async function pingService(svc: SecretKeyDoc) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(svc.endpoint)
    const latency = Date.now() - start
    await addHistory({
      status: "health_ping",
      responseTime: latency,
      category: svc.category,
      regionId: svc.regionId,
      service: svc.service,
      details: { endpoint: svc.endpoint, status: res.status, ok: res.ok }
    })
  } catch (e: any) {
    await addHistory({
      status: "health_ping_fail",
      responseTime: 0,
      category: svc.category,
      regionId: svc.regionId,
      service: svc.service,
      details: { endpoint: svc.endpoint, error: e.message }
    })
  }
}

function startPingLoop() {
  if (pingInterval) clearInterval(pingInterval)
  pingInterval = setInterval(async () => {
    if (!DB_READY) return
    const services = await SecretKeyModel.find({ endpoint: { $exists: true } }).lean()
    if (!services.length) return
    await mapWithConcurrency(services as any, pingService as any, PING_CONCURRENCY)
  }, PING_INTERVAL_MS)
}
startPingLoop()

const app = new Elysia()

app.use(
  cors({
    origin: (origin) => {
      if (CORS_ORIGINS.includes("*")) return true
      return CORS_ORIGINS.includes(origin)
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    headers: ["Content-Type", "Authorization", "x-api-key"]
  })
)

app.get("/api/health", async () => {
  await addHistory({
    status: "server_health_ping",
    responseTime: 0,
    category: "main",
    regionId: "sys",
    service: "monitor"
  })
  return { status: "ok", uptime: process.uptime() }
})

app.get("/api/health-pings", async () => {
  const data = await HistoryModel.find({ status: "health_ping" }).sort({ timestamp: -1 }).limit(100).lean()
  return { data }
})

app.post(
  "/auth",
  async ({ body }) => {
    const { service, workerId, regionId, category, endpoint } = body
    if (!ALLOWED_REGIONS.includes(regionId)) return { status: 400, body: { message: "Region not allowed" } }

    const cat = category || "main"
    if (!ALLOWED_CATEGORIES.includes(cat)) return { status: 400, body: { message: "Category not allowed" } }

    const instanceId =
      workerId && workerId !== "default_worker"
        ? `${service}_${regionId}_${workerId}`
        : `${service}_${regionId}`

    const sk = await SecretKeyModel.findOneAndUpdate(
      { instanceId },
      {
        $setOnInsert: {
          instanceId,
          service,
          workerId: workerId || "default_worker",
          regionId,
          category: cat,
          secretKey: crypto.randomUUID(),
          endpoint,
          createdAt: new Date(),
          updatedAt: new Date()
      }
      },
      { new: true, upsert: true }
    )

    await addHistory({ status: "auth_success", responseTime: 0, category: cat, regionId, service })
    return { token: sk!.secretKey, instanceId }
  },
  {
    body: t.Object({
      service: t.String(),
      workerId: t.Optional(t.String()),
      regionId: t.String(),
      category: t.Optional(t.String()),
      endpoint: t.String()
    })
  }
)

async function requireApiKey(ctx: any) {
  const key = ctx.request.headers.get("x-api-key");
  if (!key) return { ok: false, code: 401, body: { message: "Missing api key" } }
  const sk = await SecretKeyModel.findOne({ secretKey: key }).lean()
  if (!sk) return { ok: false, code: 403, body: { message: "Forbidden" } }
  return { ok: true, sk }
}

app.post(
  "/report-stats",
  async (ctx) => {
    const auth = await requireApiKey(ctx)
    if (!auth.ok) return { status: auth.code, body: auth.body }

    const { service, workerId, regionId, stats, category, endpoint } = ctx.body

    if (!ALLOWED_REGIONS.includes(regionId)) return { status: 400, body: { message: "Region not allowed" } }

    const cat = category || "main"
    if (!ALLOWED_CATEGORIES.includes(cat)) return { status: 400, body: { message: "Category not allowed" } }

    const instanceId =
      workerId && workerId !== "default_worker"
        ? `${service}_${regionId}_${workerId}`
        : `${service}_${regionId}`

    const sk = await SecretKeyModel.findOne({ instanceId })
    if (!sk) return { status: 403, body: { message: "Forbidden instance" } }

    await StatReportModel.create({
      dataKey: crypto.randomUUID(),
      service,
      workerId: workerId || "default_worker",
      regionId,
      category: cat,
      stats,
      endpoint: endpoint || sk.endpoint
    })

    pingService(sk as any).catch(() => {})

    await addHistory({ status: "report_stored", responseTime: 0, category: cat, regionId, service })
    return { message: "Stored" }
  },
  {
    body: t.Object({
      service: t.String(),
      workerId: t.Optional(t.String()),
      regionId: t.String(),
      stats: t.Any(),
      category: t.Optional(t.String()),
      endpoint: t.Optional(t.String())
    })
  }
)

app.get("/api/stats", async ({ query }) => {
  const { service, region, category, limit = 50 } = query
  const filter: any = {}
  if (service) filter.service = service
  if (region) filter.regionId = region
  if (category) filter.category = category
  const reports = await StatReportModel.find(filter).sort({ receivedAt: -1 }).limit(Number(limit)).lean()
  return { reports }
})

app.get("/api/history", async ({ query }) => {
  const { category, region, service, limit = 200 } = query
  const filter: any = {}
  if (category) filter.category = category
  if (region) filter.regionId = region
  if (service) filter.service = service
  const history = await HistoryModel.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).lean()
  return { history }
})

const server = app.listen(PORT, () => {
  logger("success", `Elysia listening ${PORT}`)
  addHistory({ status: "server_started", responseTime: 0, category: "main", regionId: "sys", service: "server" })
})

async function shutdown() {
  logger("info", "shutting down...")
  if (pingInterval) clearInterval(pingInterval)
  await mongoose.disconnect()
  server.stop()
  logger("success", "server closed")
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
