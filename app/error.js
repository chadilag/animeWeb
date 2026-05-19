'use client';

export default function Error({ error, reset }) {
  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      justifyContent: 'center', height: '60vh', gap: '1rem', color: 'white' 
    }}>
      <h2>😔 Service temporairement indisponible</h2>
      <p>{error.message}</p>
      <button 
        onClick={() => reset()}
        style={{ padding: '0.5rem 1.5rem', background: '#e63946', border: 'none', 
                 borderRadius: '8px', color: 'white', cursor: 'pointer' }}
      >
        Réessayer
      </button>
    </div>
  );
}