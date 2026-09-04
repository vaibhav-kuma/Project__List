import React, { useState } from 'react';
import axios from 'axios';

const RegisterPage = ({ onShowLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      await axios.post('http://localhost:8000/register', formData);
      setSuccess('Registration successful! Please login.');
    } catch (err) {
      setError('Registration failed. Email may already be in use.');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Register</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        <button type="submit" style={{ marginTop: '1rem' }}>Register</button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Already have an account? <button onClick={onShowLogin}>Login</button>
      </p>
    </div>
  );
};

export default RegisterPage;
