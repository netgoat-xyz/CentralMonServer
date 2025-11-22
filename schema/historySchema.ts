import mongoose from "mongoose"
import Schema = mongoose.Schema

const historySchema = new Schema<HistoryDoc>({
  status: String,
  responseTime: Number,
  timestamp: { type: Date, default: Date.now },
  category: String,
  regionId: String,
  service: String,
  details: Object
})

historySchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 })

export default mongoose.model("History", historySchema)
