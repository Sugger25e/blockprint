import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { useEffect } from 'react';
import { ModelsProvider } from './context/ModelsContext';
import { ViewerStateProvider } from './context/ViewerStateContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ModelDetail from './pages/ModelDetail';
import User from './pages/User';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import FAQ from './pages/FAQ';
import Admin from './pages/Admin';
import ManageEdit from './pages/ManageEdit';
import ProfileManage from './pages/ProfileManage';
import NotFound from './pages/NotFound';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

function App() {
  useEffect(() => {
    const today = new Date().toDateString();
    if (localStorage.getItem('visited_' + today) !== 'true') {
      fetch(`${API_BASE}/api/track-visit`, { method: 'POST' }).then(() => {
        localStorage.setItem('visited_' + today, 'true');
      }).catch(() => {});
    }
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <UiProvider>
          <ModelsProvider>
            <ViewerStateProvider>
              <div className="app-shell">
                <Navbar />
                <main className="app-main">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/all" element={<Home />} />
                    <Route path="/all/:page" element={<Home />} />
                    <Route path="/:category" element={<Home />} />
                    <Route path="/:category/:page" element={<Home />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/model/:id" element={<ModelDetail />} />
                    <Route path="/user/:author" element={<User />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/manage/:id" element={<ManageEdit />} />
                    <Route path="/profile/:userid/manage/:id" element={<ProfileManage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </ViewerStateProvider>
          </ModelsProvider>
          </UiProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
