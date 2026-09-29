import { NavLink, Route, Routes } from 'react-router-dom'
import './styles/admin.scss'
import './styles/audience.scss'
import './styles/landing.scss'
import './styles/participant.scss'
import AdminPage from './pages/AdminPage'
import AudiencePage from './pages/AudiencePage'
import LandingPage from './pages/LandingPage'
import ParticipantQuizPage from './pages/ParticipantQuizPage'
import QuizResultPage from './pages/QuizResultPage'

function AppLayout() {

 

  return (
    <>
      <header className="top-nav">
        <div className="top-nav__inner">
          <NavLink to="/" className="top-nav__brand">
            Quizz
          </NavLink>

          <nav className="top-nav__links" aria-label="Main navigation">
            <NavLink to="/" end className={({ isActive }) => `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/quiz" className={({ isActive }) => `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`}>
              Quiz
            </NavLink>
            <NavLink to="/audience" className={({ isActive }) => `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`}>
              Audience
            </NavLink>
            <NavLink to="/admin/quiz/multiple-questions" className={({ isActive }) => `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`}>
              Admin
            </NavLink>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/quiz/multiple-questions" element={<AdminPage />} />
        <Route path="/quiz" element={<ParticipantQuizPage />} />
        <Route path="/quiz/result" element={<QuizResultPage />} />
        <Route path="/audience" element={<AudiencePage />} />
      </Routes>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>© {new Date().getFullYear()} Quizz. All rights reserved.</span>
        </div>
      </footer>
    </>
  )
}

function App() {
  return <AppLayout />
}

export default App
