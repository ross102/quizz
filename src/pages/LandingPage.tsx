import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

const evaluationUrl = 'https://eval.fsdhmb.com/quiz'

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-badge">Live quiz platform</span>
          <h1>Turn every session into a smarter, more engaging experience.</h1>
          <p>
            Create quizzes, launch them to participants, and view audience responses live in one
            streamlined workflow.
          </p>

          <div className="landing-actions">
            <Link to="/quiz" className="primary-action">
              Start quiz
            </Link>
            <Link to="/admin/quiz/multiple-questions" className="secondary-action">
              Admin panel
            </Link>
          </div>
        </div>

        <div className="landing-qr">
          <a
            className="landing-qr__link"
            href={evaluationUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open evaluation website"
          >
            <QRCodeSVG
              value={evaluationUrl}
              size={224}
              level="H"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#172b4d"
              title="QR code for eval.fsdhmb.com/quiz"
            />
          </a>
          <p className="landing-qr__label">Scan to open</p>
        </div>
      </section>

      <section className="landing-live" aria-labelledby="landing-live-title">
        <div className="landing-live__copy">
          <span className="landing-badge">Made for live sessions</span>
          <h2 id="landing-live-title">Every answer becomes part of the conversation.</h2>
          <p>
            Bring participants into one shared experience. Responses appear as they come in, so
            hosts can see the room’s thinking and keep the discussion moving.
          </p>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="floating-card floating-card--top">
            <svg viewBox="0 0 64 64" role="img">
              <rect x="10" y="18" width="44" height="28" rx="8" fill="#eef2ff" />
              <circle cx="24" cy="32" r="6" fill="#5b4df5" />
              <rect x="34" y="25" width="12" height="4" rx="2" fill="#5b4df5" opacity="0.75" />
              <rect x="34" y="33" width="16" height="4" rx="2" fill="#5b4df5" opacity="0.5" />
            </svg>
            <div>
              <strong>Live results</strong>
                <span>Responses arrive live</span>
            </div>
          </div>

          <div className="orbit-ring" />
          <div className="pulse-dot pulse-dot--one" />
          <div className="pulse-dot pulse-dot--two" />
        </div>
      </section>

      <section className="landing-features">
        <article className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M4 18.5V5.5A1.5 1.5 0 0 1 5.5 4H18.5A1.5 1.5 0 0 1 20 5.5V18.5A1.5 1.5 0 0 1 18.5 20H5.5A1.5 1.5 0 0 1 4 18.5ZM8 8h8M8 12h8M8 16h5" />
            </svg>
          </div>
          <h2>Smart setup</h2>
          <p>
            Quizzes make learning more interactive, help people retain information, and give teams a
            fast way to measure understanding without lengthy forms or manual follow-up.
          </p>
        </article>

        <article className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M12 3v18M3 12h18M6.5 6.5l11 11M17.5 6.5l-11 11" />
            </svg>
          </div>
          <h2>Audience insights</h2>
          <p>
            Live audience feedback keeps people engaged, reveals trends instantly, and creates a more
            dynamic discussion where every response feels timely and relevant.
          </p>
        </article>
      </section>
    </main>
  )
}

export default LandingPage
