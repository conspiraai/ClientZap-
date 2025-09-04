export default function App() {
  return (
    <>
      <header className="header">
        <nav className="nav">
          <div className="left">
            <a className="btn" href="/">HOME</a>
            <button className="btn" type="button" disabled>MARKET ▾</button>
          </div>
          <div className="right">
            <button className="btn" type="button" disabled>SOURCES ▾</button>
          </div>
        </nav>
      </header>

      <main className="main">
        <h1 className="brand">CONSPIRA AI</h1>
        <p className="tagline">Uncover the Crypto Undercurrent</p>

        <div className="ctaRow">
          <a className="btn" href="#" aria-disabled="true">›_ Enter Terminal</a>

          <a
            className="btn btn--accent"
            href="https://x.com/conspira_ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow on X
          </a>

          <input className="input" placeholder="Enter email" />
          <button className="go go--accent" type="button">Go</button>
        </div>

        <p className="footer">Site is live. Modules are coming online.</p>
      </main>
    </>
  );
}
