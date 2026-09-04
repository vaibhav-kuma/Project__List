import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.js"
import jobRoutes from "./routes/jobs.js"
import emailRoutes from "./routes/email.js"

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

app.use("/api/auth", authRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/email", emailRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

