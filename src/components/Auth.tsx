// src/components/Auth.tsx
import { useState } from 'react';
import { auth, db, googleProvider } from '../firebase'; // ✨ Importerat googleProvider
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'; // ✨ Importerat signInWithPopup
import { doc, setDoc, getDoc } from 'firebase/firestore'; // ✨ Importerat getDoc för att kolla om användaren finns

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
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  // ✨ Ny funktion för Google-inloggning
  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Kolla om användaren redan finns i Firestore-databasen
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      // Om det är en helt ny användare, spara dem i databasen
      if (!userDocSnap.exists()) {
        // Skapa ett standardanvändarnamn baserat på Google-namnet eller e-posten
        const generatedUsername = (user.displayName || user.email?.split('@')[0] || 'user')
          .toLowerCase()
          .replace(/\s+/g, ''); // Tar bort eventuella mellanslag

        await setDoc(userDocRef, {
          uid: user.uid,
          username: generatedUsername,
          email: user.email
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Google sign-in failed.');
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-intro">
        <h2 className="auth-intro-title">Yoo Chat</h2>
        <p className="auth-intro-text">
          A simple, fast chat for staying close with friends through messages, contacts, and clean conversations.
        </p>
      </div>
      <div className="auth-card">
        <h1 className="auth-logo">yoo</h1>
        <p className="auth-subtitle">
          {isRegister ? 'Create an account to start chatting' : 'Log in to your account'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <input 
              className="auth-input"
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          )}
          <input 
            className="auth-input"
            type="email" 
            placeholder="Email address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            className="auth-input"
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="auth-submit-btn">
            {isRegister ? 'Sign up' : 'Log in'}
          </button>
        </form>

        {/* ✨ Avskiljare och Google-knapp */}
        <div className="auth-divider">or</div>

        <button 
          onClick={handleGoogleSignIn} 
          className="auth-google-btn"
          type="button"
        >
          Sign in with Google
        </button>

        <button 
          onClick={() => {
            setIsRegister(!isRegister);
            setError(''); 
          }} 
          className="auth-switch-btn"
        >
          {isRegister ? 'Already have an account? Log in' : 'No account yet? Create one here'}
        </button>
      </div>
    </div>
  );
}