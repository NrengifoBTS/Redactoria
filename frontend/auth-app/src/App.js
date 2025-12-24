//redactoria/fronted/auth-app/src/app.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import ProtectedPage from "./Protected";
import Redactor from "./Redactor";
import Dashboard from "./Dashboard";
import Home from "./Home";
import { AppProvider } from "./context/AppContext";
import BlogGeneracion from "./Blog_Generacion";
import Dashboard_Blog from "./Dashboard_Blog";
import Analytics from "./Analytics";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/protected" element={<ProtectedPage />} />
          <Route path="/redactor/:lpId" element={<Redactor />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/blog/edit/:blogId" element={<BlogGeneracion />} />
          <Route path="/dashboard_blog" element={<Dashboard_Blog />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
