import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "./context/AppContext";
import LoginModal from "./Loginmodal";
import ProyectoModal from "./ProyectoModal";
import "./Home.css";
import milesLogo from "./img/Miles-car-rental.png";

const Home = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProyectoModalOpen, setIsProyectoModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const { currentUser, logout } = useApp();
  const handleLogout = () => {
    logout();
  };

  const handleOpenProyecto = (proyecto) => {
    setSelectedProyecto(proyecto);
    setIsProyectoModalOpen(true);
  };

  const handleCloseProyectoModal = () => {
    setIsProyectoModalOpen(false);
    setSelectedProyecto(null);
  };

  const getAvatarText = () => {
    if (!currentUser) return "";
    if (currentUser.avatar) return currentUser.avatar;
    if (currentUser.first_name || currentUser.last_name) {
      return `${(currentUser.first_name?.[0] || "").toUpperCase()}${(currentUser.last_name?.[0] || "").toUpperCase()}`;
    }
    return (currentUser.email?.[0] || "").toUpperCase();
  };

  const getDisplayName = () => {
    if (!currentUser) return "";
    if (currentUser.name) return currentUser.name;
    if (currentUser.first_name || currentUser.last_name) {
      return `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
    }
    return currentUser.email || "";
  };
  const proyectos = [
    {
      id: 1,
      titulo: "Redactoria MCR",
      descripcion:
        "Sistema de redacción y gestión de contenido con IA integrada para generación automática de landings pages",
      imagen: milesLogo,
      links: [
        {
          nombre: "Dashboard Landings Pages",
          url: "/dashboard/mcr",
          descripcion: "Accede al panel de control de landings pages de MCR",
        },
        {
          nombre: "Dashboard Blogs",
          url: "/dashboard_blog",
          descripcion: "Accede al panel de control principal de blogs",
        },
      ],
      estado: "Activo",
      tecnologias: ["IA", "Generación de contenido", "SEO"],
    },
    {
      id: 2,
      titulo: "Redactoria Viajemos",
      descripcion:
        "Sistema de redacción y gestión de contenido con IA integrada para la generación automática y optimizada de artículos y publicaciones de blog.",
      imagen: "https://dce.viajemos.com/images/viajemos/logo/logo.svg",
      links: [
        {
          nombre: "Dashboard Landings Pages",
          url: "/dashboard/viajemos",
          descripcion:
            "Accede al panel de control de landings pages de Viajemos",
        },
        {
          nombre: "Dashboard Blogs",
          url: "/dashboard_blog",
          descripcion: "Accede al panel de control principal de blogs",
        },
      ],
      estado: "En desarrollo",
      tecnologias: ["IA", "Generación de contenido", "SEO"],
    },
    {
      id: 3,
      titulo: "Redactoria Outlet",
      descripcion:
        "Sistema de redacción y gestión de contenido con IA integrada para la generación automática y optimizada de artículos y publicaciones de blog.",
      imagen: "https://dce.outletrentalcars.com/images/outlet/logo/logo.svg",
      links: [
        {
          nombre: "Dashboard Landings Pages",
          url: "/dashboard/outlet",
          descripcion: "Accede al panel de control de landings pages de Outlet",
        },
        {
          nombre: "Dashboard Blogs",
          url: "/dashboard_blog",
          descripcion: "Accede al panel de control principal de blogs",
        },
      ],
      estado: "En desarrollo",
      tecnologias: ["IA", "Generación de contenido", "SEO"],
    },
    {
      id: 4,
      titulo: "Redactoria Guia Legal",
      descripcion:
        "Sistema de redacción y gestión de contenido con IA integrada para la generación automática y optimizada de artículos y publicaciones de blog.",
      imagen:
        "https://guialegal.com/wp-content/uploads/2021/02/logo-guia-legal.svg",
      links: [
        {
          nombre: "Dashboard Landings Pages",
          url: "/dashboard/guialegal",
          descripcion:
            "Accede al panel de control de landings pages de Guía Legal",
        },
        {
          nombre: "Dashboard Blogs",
          url: "/dashboard_blog",
          descripcion: "Accede al panel de control principal de blogs",
        },
      ],
      estado: "En desarrollo",
      tecnologias: ["IA", "Generación de contenido", "SEO"],
    },
    {
      id: 5,
      titulo: "Redactoria Arriendo",
      descripcion:
        "Sistema de redacción y gestión de contenido con IA integrada para la generación automática y optimizada de artículos y publicaciones de blog.",
      imagen:
        "https://cdn.arriendo.com/co/wp-content/uploads/2024/06/logo-svg.svg",
      links: [
        {
          nombre: "Dashboard Landings Pages",
          url: "/dashboard/arriendo",
          descripcion:
            "Accede al panel de control de landings pages de Arriendo",
        },
        {
          nombre: "Dashboard Blogs",
          url: "/dashboard_blog",
          descripcion: "Accede al panel de control principal de blogs",
        },
      ],
      estado: "En desarrollo",
      tecnologias: ["IA", "Generación de contenido", "SEO"],
    },
    {
      id: 6,
      titulo: " Generación Multimedia",
      descripcion:
        "Plataforma integral para la creación de contenido multimedia utilizando inteligencia artificial, que permite generar imágenes y videos personalizados de alta calidad.",
      imagen: "https://cdn-icons-png.flaticon.com/512/2920/2920277.png",
      links: [
        {
          nombre: "ComfyUI Local",
          url: process.env.REACT_APP_COMFYUI_URL || "http://127.0.0.1:8080",
          descripcion: "Generador de imágenes local",
        },
        {
          nombre: "Galería de Ejemplos",
          url: "/dashboard/gallery",
          descripcion: "Explora ejemplos generados",
        },
      ],
      estado: "En desarrollo",
      tecnologias: ["IA", "Imagenes", "Videos"],
    },
    {
      id: 7,
      titulo: "Redes Sociales",
      descripcion:
        "Respuesta automatizadas con agentes IA en las diferentes redes sociales.",
      imagen: "https://cdn-icons-png.flaticon.com/512/3178/3178158.png",
      link: "",
      estado: "Próximamente",
      tecnologias: [""],
    },
  ];

  // Logos de empresas con sus redes sociales
  const empresasClientes = [
    {
      nombre: "MCR",
      logo: milesLogo,
      url: "https://www.milescarrental.com",
      redes: [
        {
          nombre: "Facebook",
          url: "https://web.facebook.com/MilesCarRental.ES",
          icon: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
        },
        {
          nombre: "TikTok",
          url: "https://www.tiktok.com/@milescarrental",
          icon: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
        },
        {
          nombre: "Instagram",
          url: "https://www.instagram.com/milescarrental.com_/",
          icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
        },
      ],
    },
    {
      nombre: "VJS",
      logo: "https://dce.viajemos.com/images/viajemos/logo/logo.svg",
      url: "https://www.viajemos.com",
      redes: [
        {
          nombre: "Facebook",
          url: "https://www.facebook.com/Viajemoscom-106478295647370",
          icon: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
        },
        {
          nombre: "TikTok",
          url: "https://www.tiktok.com/@viajemos.com_",
          icon: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
        },
        {
          nombre: "Instagram",
          url: "https://www.instagram.com/viajemos.com_/",
          icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
        },
      ],
    },
    {
      nombre: "Outlet",
      logo: "https://dce.outletrentalcars.com/images/outlet/logo/logo.svg",
      url: "https://www.outletrentalcars.com",
      redes: [
        {
          nombre: "Facebook",
          url: "https://www.facebook.com/Outlet-Rental-Cars-107043202417884",
          icon: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
        },
        {
          nombre: "TikTok",
          url: "https://twitter.com/rentalcaroutlet",
          icon: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
        },
        {
          nombre: "Instagram",
          url: "https://www.instagram.com/outletrentalcars/",
          icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
        },
      ],
    },
    {
      nombre: "GL",
      logo: "https://guialegal.com/wp-content/uploads/2021/02/logo-guia-legal.svg",
      url: "https://guialegal.com/",
      redes: [
        {
          nombre: "X",
          url: "https://twitter.com/rentalcaroutlet",
          icon: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
        },
        {
          nombre: "Facebook",
          url: "https://www.facebook.com/Outlet-Rental-Cars-107043202417884",
          icon: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
        },
        {
          nombre: "Instagram",
          url: "https://www.instagram.com/outletrentalcars/",
          icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
        },
      ],
    },
    {
      nombre: "Arriendo",
      logo: "https://cdn.arriendo.com/co/wp-content/uploads/2024/06/logo-svg.svg",
      url: "https://www.microsoft.com",
      redes: [
        {
          nombre: "X",
          url: "https://www.youtube.com/@guialegal.com.oficial",
          icon: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
        },
        {
          nombre: "TikTok",
          url: "https://www.tiktok.com/@guialegal.com",
          icon: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
        },
        {
          nombre: "Instagram",
          url: "https://www.instagram.com/guialegal.com.oficial/",
          icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
        },
      ],
    },
  ];

  return (
    <div className="home-container">
      {/* Header con Logo */}
      <header className="main-header">
        <div className="header-content">
          <Link to="/home" className="logo-link">
            <div className="logo">
              <img
                src="https://browsertravelsolutions.com/wp-content/uploads/2022/02/Logo-1.png"
                alt="Logo BTS"
                className="logo-image"
              />
              <span className="logo-text">Presents Omina test </span>
            </div>
          </Link>
          <nav className="header-nav">
            {currentUser ? (
              <div className="user-menu">
                <div className="user-avatar">{getAvatarText()}</div>
                <span className="user-name">{getDisplayName()}</span>

                <button onClick={handleLogout} className="logout-button">
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="nav-link nav-link-primary"
                style={{ border: "none", cursor: "pointer" }}
              >
                Iniciar Sesión
              </button>
            )}
          </nav>
        </div>
      </header>

      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Omina</h1>
          {/* Hero Section */}
          <div className="hero-badge">
            <span>Ecosistema Digital Integrado</span>
          </div>
          <p className="hero-subtitle">
            Un espacio unificado donde se presentan, organizan y conectan
            nuestras soluciones y desarrollos en IA, mostrando la innovación que
            impulsa cada iniciativa.
          </p>
        </div>
      </div>

      {/* Sección de Proyectos */}
      <div className="proyectos-section">
        <div className="section-header">
          <h2 className="section-title">Nuestros Proyectos</h2>
          <p className="section-subtitle">
            Explora nuestro ecosistema de soluciones diseñadas para impulsar la
            productividad y la innovación
          </p>
        </div>

        {/* Grid de Tarjetas */}
        <div className="proyectos-grid">
          {proyectos.map((proyecto) => (
            <div key={proyecto.id} className="proyecto-card">
              {/* Imagen del proyecto */}
              <div className="proyecto-imagen-container">
                <img
                  src={proyecto.imagen}
                  alt={proyecto.titulo}
                  className="proyecto-imagen"
                />
                <div
                  className="proyecto-overlay"
                  style={{ backgroundColor: proyecto.color }}
                >
                  <span className="proyecto-estado-badge">
                    {proyecto.estado}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="proyecto-body">
                <h3 className="proyecto-titulo-card">{proyecto.titulo}</h3>
                <p className="proyecto-descripcion">{proyecto.descripcion}</p>

                {/* Tecnologías */}
                <div className="tecnologias">
                  {proyecto.tecnologias.map((tech, index) => (
                    <span key={index} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Botón */}
                {currentUser ? (
                  <button
                    onClick={() => handleOpenProyecto(proyecto)}
                    className="proyecto-button"
                    style={{ cursor: "pointer", border: "n  one" }}
                  >
                    Abrir proyecto
                  </button>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="proyecto-button"
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    Iniciar sesión para ver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección About */}
      <div className="about-section">
        <div className="about-content">
          <div className="about-text">
            <h2 className="about-title">Sobre Nuestra Área</h2>
            <p className="about-paragraph">
              Somos un equipo dedicado al desarrollo de soluciones tecnológicas
              innovadoras que transforman la manera en que las empresas operan y
              crecen en la era digital.
            </p>
            <p className="about-paragraph">
              Nuestro ecosistema integrado de herramientas está diseñado para
              maximizar la eficiencia, mejorar la colaboración y potenciar la
              toma de decisiones basada en datos.
            </p>
            {/* Dashboard general solo accesible por URL directa - no mostrar link */}
          </div>

          <div className="about-features">
            <div className="feature-box">
              <div className="feature-item">
                <div
                  className="feature-icon"
                  style={{ backgroundColor: "#3B82F6" }}
                ></div>
                <div className="feature-content">
                  <h4 className="feature-title">Tecnología de Vanguardia</h4>
                  <p className="feature-text">Stack moderno y escalable</p>
                </div>
              </div>

              <div className="feature-item">
                <div
                  className="feature-icon"
                  style={{ backgroundColor: "#A855F7" }}
                ></div>
                <div className="feature-content">
                  <h4 className="feature-title">IA Integrada</h4>
                  <p className="feature-text">Automatización inteligente</p>
                </div>
              </div>

              <div className="feature-item">
                <div
                  className="feature-icon"
                  style={{ backgroundColor: "#22C55E" }}
                ></div>
                <div className="feature-content">
                  <h4 className="feature-title">Enfoque en Resultados</h4>
                  <p className="feature-text">Soluciones que generan valor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        {/* Logos de Empresas Clientes */}
        <div className="empresas-section">
          <p className="empresas-title">Empresas con las que trabajamos</p>
          <div className="empresas-grid">
            {empresasClientes.map((empresa, index) => (
              <div key={index} className="empresa-card">
                <a
                  href={empresa.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="empresa-logo-link"
                >
                  <div className="empresa-logo-card">
                    <img
                      src={empresa.logo}
                      alt={empresa.nombre}
                      className="empresa-logo"
                    />
                  </div>
                </a>

                {/* Redes sociales de cada empresa */}
                <div className="empresa-redes">
                  {empresa.redes.map((red, redIndex) => (
                    <a
                      key={redIndex}
                      href={red.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="empresa-social-link"
                      title={red.nombre}
                    >
                      <svg
                        className="empresa-social-icon"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d={red.icon} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="footer-copyright">
          <p>© 2025 Browser Travel SOLUTIONS. Todos los derechos reservados.</p>
        </div>
      </footer>
      {/* Modal de Login */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Modal de Selección de Proyecto */}
      <ProyectoModal
        isOpen={isProyectoModalOpen}
        onClose={handleCloseProyectoModal}
        proyecto={selectedProyecto}
      />
    </div>
  );
};

export default Home;
