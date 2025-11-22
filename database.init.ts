import mongoose from "mongoose"
import logger from "./logger"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/stats_db"

let DB_READY = false

await mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    DB_READY = true
    logger("success", `Mongo connected ${MONGODB_URI}`)
  })
  .catch((e) => logger("error", "mongo connect:", e.message))

mongoose.connection.on("disconnected", () => logger("warn", "mongoose disconnected"))
mongoose.connection.on("reconnected", () => logger("info", "mongoose reconnected"))

export default DB_READY