export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/login`;
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Gerenciador Mercado Livre</h1>
      <button onClick={handleLogin}>Conectar com Mercado Livre</button>
    </div>
  );
}