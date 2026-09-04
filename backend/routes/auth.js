import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import Company from "../models/Company.js"
import { sendVerificationEmail, sendVerificationSMS } from "../utils/verification.js"

const router = express.Router()

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body
    const company = new Company({ name, email, password, mobile })
    await company.save()

    sendVerificationEmail(company.email)
    sendVerificationSMS(company.mobile)

    res.status(201).json({ message: "Company registered. Please verify your email and mobile." })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const company = await Company.findOne({ email })
    if (!company || !(await bcrypt.compare(password, company.password))) {
      throw new Error("Invalid login credentials")
    }
    if (!company.isEmailVerified || !company.isMobileVerified) {
      throw new Error("Please verify your email and mobile before logging in")
    }
    const token = jwt.sign({ id: company._id }, process.env.JWT_SECRET, { expiresIn: "1d" })
    res.cookie("token", token, { httpOnly: true, maxAge: 86400000 }) // 1 day
    res.json({ message: "Logged in successfully" })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post("/logout", (req, res) => {
  res.clearCookie("token")
  res.json({ message: "Logged out successfully" })
})

export default router

