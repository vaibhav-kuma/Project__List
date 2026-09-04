import React, { useState } from "react"
import axios from "axios"
import { useHistory } from "react-router-dom"

function PostJob() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    experienceLevel: "",
    candidates: "",
    endDate: "",
  })
  const history = useHistory()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post("/api/jobs", {
        ...formData,
        candidates: formData.candidates.split(",").map((email) => email.trim()),
      })
      history.push("/dashboard")
    } catch (error) {
      alert(error.response.data.error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="title" placeholder="Job Title" onChange={handleChange} required />
      <textarea name="description" placeholder="Job Description" onChange={handleChange} required />
      <select name="experienceLevel" onChange={handleChange} required>
        <option value="">Select Experience Level</option>
        <option value="BEGINNER">Beginner</option>
        <option value="INTERMEDIATE">Intermediate</option>
        <option value="EXPERT">Expert</option>
      </select>
      <input type="text" name="candidates" placeholder="Candidate Emails (comma-separated)" onChange={handleChange} />
      <input type="date" name="endDate" onChange={handleChange} required />
      <button type="submit">Post Job</button>
    </form>
  )
}

export default PostJob

