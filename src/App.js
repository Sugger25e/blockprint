import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModelsProvider } from './context/ModelsContext';
import { ViewerStateProvider } from './context/ViewerStateContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ModelDetail from './pages/ModelDetail';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
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
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/model/:id" element={<ModelDetail />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </ViewerStateProvider>
          </ModelsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
