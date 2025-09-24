import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import ProtectedPage from "./Protected";
import Redactor from "./Redactor";
import Dashboard from "./Dashboard";
import { AppProvider } from "./context/AppContext";
import BlogGeneracion from "./Blog_Generacion";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/protected" element={<ProtectedPage />} />
          <Route path="/redactor/:lpId" element={<Redactor />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/blog_generacion" element={<BlogGeneracion />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
