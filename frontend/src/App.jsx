
import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (!data.token) {
        throw new Error("Login response did not contain a token");
      }

      setToken(data.token);
      setMessage("Login successful!");

      await loadAccounts(data.token);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts(authToken) {
    try {
      const response = await fetch(`${API_URL}/api/accounts/my`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load accounts");
      }

      setAccounts(data.accounts || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function handleLogout() {
    setToken("");
    setAccounts([]);
    setEmail("");
    setPassword("");
    setMessage("You have logged out.");
  }

  return (
    <div className="app">
      <header className="navbar">
        <h1>BalanceVault</h1>
        <span>Secure Banking Demo</span>
      </header>

      <main className="container">
        {!token ? (
          <section className="login-card">
            <h2>Welcome Back!</h2>
            <p>Login to access your BalanceVault account.</p>

            <form onSubmit={handleLogin}>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {message && <p className="message">{message}</p>}
          </section>
        ) : (
          <section className="dashboard">
            <div className="dashboard-heading">
              <div>
                <h2>Customer Dashboard</h2>
                <p>Welcome to BalanceVault!</p>
              </div>

              <button className="logout" onClick={handleLogout}>
                Logout
              </button>
            </div>

            <h3>My Accounts</h3>

            {accounts.length === 0 ? (
              <p>No accounts found.</p>
            ) : (
              <div className="account-list">
                {accounts.map((account) => (
                  <div className="account-card" key={account.id}>
                    <h3>{account.accountType} Account</h3>
                    <p>
                      Account Number: {account.accountNumber}
                    </p>
                    <p>Status: {account.status}</p>
                    <h2>
                      {account.currency} {account.balance}
                    </h2>
                  </div>
                ))}
              </div>
            )}

            {message && <p className="message">{message}</p>}
          </section>
        )}
      </main>

      <footer>
        BalanceVault | Hackathon Demonstration Project
        <p>Uses synthetic data only. No real money is involved.</p>
      </footer>
    </div>
  );
}

export default App;
