import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ProtectedPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      const API_BASE =
        process.env.REACT_APP_API_URL || "http://192.168.1.129:8080";

      try {
        const response = await fetch(`${API_BASE}/auth/verify-token/${token}`);
        if (!response.ok) {
          throw new Error("Token verification failed");
        }

        const data = await response.json();

        // Lista de IDs permitidos para el dashboard
        const allowedIds = [""]; // b24536ec-d0a6-4c43-a685-be62198ca1d2

        if (!allowedIds.includes(data.id)) {
          // Si el usuario está autenticado pero no autorizado, va a la tabla
          navigate("/Redactor");
        }
      } catch (error) {
        // Si hay error con el token (inválido/expirado), va al login
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    verifyToken();
  }, [navigate]);

  // Dashboard para usuarios autorizados (temporal)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600">
          Bienvenido al dashboard. Solo usuarios autorizados pueden ver esto.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Próximamente: funcionalidades del dashboard...
        </p>
      </div>
    </div>
  );
}

export default ProtectedPage;
