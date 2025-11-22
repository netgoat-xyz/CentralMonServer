import mongoose from "mongoose"
import Schema = mongoose.Schema

const statReportSchema = new Schema<StatReportDoc>({
  dataKey: String,
  service: String,
  workerId: { type: String, default: "default_worker" },
  regionId: String,
  category: String,
  stats: Object,
  endpoint: String,
  receivedAt: { type: Date, default: Date.now }
})

export default mongoose.model("StatReport", statReportSchema)
