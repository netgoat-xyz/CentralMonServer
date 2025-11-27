import mongoose from "mongoose"
import logger from "./logger"

const sanitize = (uri: string) => {
  try {
    const u = new URL(uri)
    if (u.password) u.password = encodeURIComponent(u.password)
    return u.toString()
  } catch {
    return uri
  }
}

const raw = process.env.MONGODB_URI 
const MONGODB_URI = sanitize(raw)

let DB_READY = false as boolean

await mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    DB_READY = true
    logger("success", `Mongo connected ${MONGODB_URI}`)
  })
  .catch((e: Error) => logger("error", "mongo connect:", e.message))

mongoose.connection.on("disconnected", () => logger("warn", "mongoose disconnected"))
mongoose.connection.on("reconnected", () => logger("info", "mongoose reconnected"))

export default DB_READY
