import React, { useState } from "react"
import axios from "axios"

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post("/api/auth/register", formData)
      alert("Registration successful. Please check your email and mobile for verification.")
    } catch (error) {
      alert(error.response.data.error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="name" placeholder="Company Name" onChange={handleChange} required />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
      <input type="tel" name="mobile" placeholder="Mobile" onChange={handleChange} required />
      <button type="submit">Register</button>
    </form>
  )
}

export default Register

