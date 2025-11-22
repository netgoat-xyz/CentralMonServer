import mongoose from "mongoose"
import Schema = mongoose.Schema

const secretKeySchema = new Schema<SecretKeyDoc>({
  instanceId: { type: String, unique: true },
  service: String,
  workerId: { type: String, default: "default_worker" },
  regionId: String,
  category: String,
  secretKey: String,
  endpoint: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model("SecretKey", secretKeySchema)
