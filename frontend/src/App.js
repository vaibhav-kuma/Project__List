import React from "react"
import { BrowserRouter as Router, Route, Switch } from "react-router-dom"
import Register from "./components/Register"
import Login from "./components/Login"
import Dashboard from "./components/Dashboard"
import PostJob from "./components/PostJob"

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/post-job" component={PostJob} />
      </Switch>
    </Router>
  )
}

export default App

