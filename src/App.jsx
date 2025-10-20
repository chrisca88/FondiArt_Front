// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import FullWidthLayout from './layouts/FullWidthLayout.jsx'

import Home from './pages/Home.jsx'
import FAQ from './pages/FAQ.jsx'
import Info from './pages/Info.jsx'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'

import BuyerDashboard from './pages/dashboard/BuyerDashboard.jsx'
import ArtistDashboard from './pages/dashboard/ArtistDashboard.jsx'
import Redirector from './pages/dashboard/Redirector.jsx'
import RequireAuth from './hocs/auth/RequireAuth.jsx'

import ArtworkDetail from './pages/artworks/ArtworkDetail.jsx'
import Profile from './pages/account/Profile.jsx'
import MyWorks from './pages/dashboard/MyWorks.jsx'
import ArtworkStats from './pages/artworks/ArtworkStats.jsx'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminArtworkReview from './pages/admin/AdminArtworkReview.jsx'
import AdminAuctions from './pages/admin/auctions/AdminAuctions.jsx'     
import AuctionDetail from './pages/admin/auctions/AuctionDetail.jsx'      

// Wallet
import Wallet from './pages/wallet/Wallet.jsx'

// NEW: Donaciones (listado + perfil)
import Donations from './pages/donations/Donations.jsx'
import ArtistDonate from './pages/donations/ArtistDonate.jsx'

import SecondaryMarket from './pages/market/SecondaryMarket.jsx'

// Proyectos
import ProjectDetail from './pages/projects/ProjectDetail.jsx'
import ProjectForm from './pages/projects/ProjectForm.jsx'
import MyProjects from './pages/projects/MyProjects.jsx'
import ProjectEdit from './pages/projects/ProjectEdit.jsx'

export default function App(){
  return (
    <Routes>
      <Route element={<FullWidthLayout/>}>
        <Route path="/" element={<Home/>} />
        <Route path="/info" element={<Info/>} />
        <Route path="/faq" element={<FAQ/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />

        {/* Rutas protegidas */}
        <Route element={<RequireAuth/>}>
          <Route path="/dashboard" element={<Redirector />} />
          <Route path="/comprar" element={<BuyerDashboard/>} />
          <Route path="/publicar" element={<ArtistDashboard/>} />
          <Route path="/publicar/:id" element={<ArtistDashboard/>} />
          <Route path="/mis-obras" element={<MyWorks/>} />
          <Route path="/cuenta" element={<Profile/>} />
          <Route path="/mercado" element={<SecondaryMarket/>} />

          {/* Wallet (todos los roles) */}
          <Route path="/wallet" element={<Wallet/>} />

          {/* Donaciones */}
          <Route path="/donaciones" element={<Donations/>} />
          <Route path="/donaciones/artista/:slug" element={<ArtistDonate/>} />

          {/* Proyectos */}
          <Route path="/mis-proyectos" element={<MyProjects/>} />
          <Route path="/proyecto/:id" element={<ProjectDetail/>} />
          <Route path="/proyecto/:id/editar" element={<ProjectEdit/>} />
          <Route path="/proyectos/nuevo" element={<ProjectForm/>} />

          {/* Detalles de obra */}
          <Route path="/obra/:id" element={<ArtworkDetail/>} />
          <Route path="/obra/:id/estadisticas" element={<ArtworkStats />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard/>} />
          <Route path="/admin/obra/:id" element={<AdminArtworkReview/>} />
          <Route path="/admin/subastas" element={<AdminAuctions/>} />
          <Route path="/admin/subastas/:id" element={<AuctionDetail/>} />
        </Route>
      </Route>
    </Routes>
  )
}
