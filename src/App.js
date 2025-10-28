import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModelsProvider } from './context/ModelsContext';
import { ViewerStateProvider } from './context/ViewerStateContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ModelDetail from './pages/ModelDetail';
import Upload from './pages/Upload';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ModelsProvider>
          <ViewerStateProvider>
            <Navbar />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/model/:id" element={<ModelDetail />} />
                <Route path="/adm-blckfl-login" element={<Admin />} />
              </Routes>
            </main>
            <Footer />
          </ViewerStateProvider>
        </ModelsProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
