import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  isMobileVerified: { type: Boolean, default: false },
})

companySchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8)
  }
  next()
})

export default mongoose.model("Company", companySchema)

