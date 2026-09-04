import express from "express"
import { authMiddleware } from "../middleware/auth.js"
import { sendJobAlert } from "../utils/email.js"

const router = express.Router()

router.post("/job-alert", authMiddleware, async (req, res) => {
  try {
    const { jobId, recipients } = req.body
    await sendJobAlert(jobId, recipients)
    res.json({ message: "Job alert sent successfully" })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router

