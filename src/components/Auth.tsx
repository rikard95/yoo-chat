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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username: username.toLowerCase().trim(),
          email: email
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Renoverar lite fula Firebase-meddelanden om du vill, annars visar vi felet
        setError(err.message);
      } else {
        setError('Ett oväntat fel inträffade.');
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-logo">yoo</h1>
        <p className="auth-subtitle">
          {isRegister ? 'Skapa ett konto för att börja chatta' : 'Logga in på ditt konto'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <input 
              className="auth-input"
              type="text" 
              placeholder="Användarnamn" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          )}
          <input 
            className="auth-input"
            type="email" 
            placeholder="E-postadress" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            className="auth-input"
            type="password" 
            placeholder="Lösenord" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="auth-submit-btn">
            {isRegister ? 'Registrera dig' : 'Logga in'}
          </button>
        </form>

        <button 
          onClick={() => {
            setIsRegister(!isRegister);
            setError(''); // Nollställ felmeddelandet vid byte av läge
          }} 
          className="auth-switch-btn"
        >
          {isRegister ? 'Har du redan ett konto? Logga in' : 'Inget konto? Skapa ett här'}
        </button>
      </div>
    </div>
  );
}