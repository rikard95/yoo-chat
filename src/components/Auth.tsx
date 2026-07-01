// src/components/Auth.tsx
import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Auth() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        // 1. Skapa användare i Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Spara användarnamn i Firestore kopplat till användarens unika UID
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username: username.toLowerCase(), // Sparar som små bokstäver för enklare sökning
          email: email
        });
      } else {
        // Logga in
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      // Check if the error object has a message property safely
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ett oväntat fel inträffade.');
      }
    }
  };

  return (
    <div className="auth-container" style={{ padding: '40px', maxWidth: '400px', margin: 'auto' }}>
      <h2>{isRegister ? 'Skapa konto' : 'Logga in'}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isRegister && (
          <input 
            type="text" 
            placeholder="Användarnamn" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
        )}
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Lösenord" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">{isRegister ? 'Registrera' : 'Logga in'}</button>
      </form>
      <button onClick={() => setIsRegister(!isRegister)} style={{ marginTop: '10px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
        {isRegister ? 'Har du redan ett konto? Logga in' : 'Inget konto? Skapa ett här'}
      </button>
    </div>
  );
}