// src/App.tsx
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import './App.css';

interface UserProfile {
  uid: string;
  username: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Styr om din befintliga sidebar ska glida fram eller inte på mobilen
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        
        // Sätt status till online direkt vid inloggning
        await updateDoc(docRef, { status: "online" }).catch(() => {});
        
        // Hämta profil för att visa användarnamn i headern
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
        setActiveChatId(null);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { status: "offline" }).catch(() => {});
    }
    signOut(auth);
  };

  if (loading) return <div style={{ padding: '20px' }}>Laddar Yoo...</div>;
  if (!user) return <Auth />;

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#111b21', color: '#fff' }}>
        
        {/* MOBILKNAPP: Togglar statet direkt */}
        <button 
          className="menu-toggle-btn"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? '✕ Stäng' : '☰ Kontakter'}
        </button>

        <h2 className="header-title" style={{ margin: '0 auto 0 15px' }}>Yoo Chat</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span className="user-info-text" style={{ fontSize: '14px', color: '#ccc' }}>
            Inloggad som: <strong style={{ color: '#fff' }}>{profile ? profile.username : 'Laddar...'}</strong>
          </span>
          <button className="logout-button" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </header>
      
      <main className="main-content">
        {/* Vi skickar med isSidebarOpen direkt som en prop till din existerande sidebar */}
        <Sidebar 
          currentUserId={user.uid} 
          onSelectChat={(id) => {
            setActiveChatId(id);
            setSidebarOpen(false); // Stänger menyn automatiskt när man väljer en kontakt på mobilen
          }} 
          isSidebarOpen={isSidebarOpen}
        />

        {/* Mörkläggnings-overlay bakom sidebaren på mobilen */}
        {isSidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <ChatArea currentUserId={user.uid} activeChatId={activeChatId} />
      </main>
      
      <footer style={{ textAlign: 'center', padding: '10px', color: '#fff', background: '#000000' }}>© 2026 Yoo Inc.</footer>
    </div>
  );
}

export default App;