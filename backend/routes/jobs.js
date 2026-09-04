import express from "express"
import Job from "../models/Job.js"
import { authMiddleware } from "../middleware/auth.js"

const router = express.Router()

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, experienceLevel, candidates, endDate } = req.body
    const job = new Job({
      company: req.company._id,
      title,
      description,
      experienceLevel,
      candidates,
      endDate,
    })
    await job.save()
    res.status(201).json(job)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.get("/", authMiddleware, async (req, res) => {
  try {
    const jobs = await Job.find({ company: req.company._id })
    res.json(jobs)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router

