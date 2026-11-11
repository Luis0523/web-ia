import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Brand from '../components/Brand.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@webia.test');
  const [password, setPassword] = useState('User123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <Brand />
        <span className="badge admin" style={{ marginBottom: 12 }}>
          Plataforma RAG + Agentes
        </span>
        <h1>Iniciar sesion</h1>
        <p className="sub">Chatbot con RAG y agentes de viaje multi-paso.</p>

        {error && <div className="alert error">{error}</div>}

        <div className="field">
          <label>Correo electronico</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Contrasena</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button className="btn primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>

        <div className="demo-box">
          <strong>Cuentas demo</strong>
          <br />
          admin@webia.test / Admin123!
          <br />
          demo@webia.test / User123!
        </div>
      </form>
    </div>
  );
}
