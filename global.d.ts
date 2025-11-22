interface HistoryDoc extends Document {
  status: string
  responseTime: number
  timestamp: Date
  category: string
  regionId: string
  service: string
  details: any
}

interface SecretKeyDoc extends Document {
  instanceId: string
  service: string
  workerId: string
  regionId: string
  category: string
  secretKey: string
  endpoint: string
  createdAt: Date
  updatedAt: Date
}

interface StatReportDoc extends Document {
  dataKey: string
  service: string
  workerId: string
  regionId: string
  category: string
  stats: any
  endpoint: string
  receivedAt: Date
}

export { SecretKeyDoc, HistoryDoc, StatReportDoc }