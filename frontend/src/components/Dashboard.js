import React, { useState, useEffect } from "react"
import axios from "axios"
import { Link } from "react-router-dom"

function Dashboard() {
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get("/api/jobs")
        setJobs(response.data)
      } catch (error) {
        console.error("Error fetching jobs:", error)
      }
    }
    fetchJobs()
  }, [])

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout")
      // Redirect to login page
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <Link to="/post-job">Post a New Job</Link>
      <button onClick={handleLogout}>Logout</button>
      <h2>Your Job Postings</h2>
      <ul>
        {jobs.map((job) => (
          <li key={job._id}>
            <h3>{job.title}</h3>
            <p>{job.description}</p>
            <p>Experience Level: {job.experienceLevel}</p>
            <p>End Date: {new Date(job.endDate).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Dashboard

