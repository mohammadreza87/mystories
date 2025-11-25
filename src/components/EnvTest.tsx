export function EnvTest() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasAnonKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Environment Variables Check:</h2>
      <p>VITE_SUPABASE_URL: {supabaseUrl || 'NOT SET ❌'}</p>
      <p>VITE_SUPABASE_ANON_KEY: {hasAnonKey ? 'SET ✅' : 'NOT SET ❌'}</p>
      <p>Environment: {import.meta.env.MODE}</p>
      <p>Base URL: {import.meta.env.BASE_URL}</p>
    </div>
  );
}