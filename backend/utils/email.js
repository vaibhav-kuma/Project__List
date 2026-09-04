import nodemailer from "nodemailer"
import Job from "../models/Job.js"

export const sendJobAlert = async (jobId, recipients) => {
  const job = await Job.findById(jobId).populate("company")

  // Create a nodemailer transporter
  const transporter = nodemailer.createTransport({
    // Configure your email service
  })

  // Send email to each recipient
  for (const recipient of recipients) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipient,
      subject: `New Job Alert: ${job.title}`,
      html: `
        <h1>${job.title}</h1>
        <p>${job.description}</p>
        <p>Experience Level: ${job.experienceLevel}</p>
        <p>End Date: ${job.endDate}</p>
        <p>Posted by: ${job.company.name}</p>
      `,
    })
  }
}

