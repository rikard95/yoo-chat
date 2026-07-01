// src/components/Sidebar.tsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface SidebarProps {
  currentUserId: string;
  onSelectChat: (id: string) => void;
}

interface UserProfile {
  uid: string;
  username: string;
  email: string;
  status?: 'online' | 'offline';
}

interface Friendship {
  id: string;
  userIds: string[];
  status: 'pending' | 'accepted';
  requestedBy: string;
  messages?: { senderId: string; text: string; createdAt?: number }[];
  lastRead?: Record<string, number>;
  friendUsername?: string;
  friendStatus?: 'online' | 'offline';
}

export default function Sidebar({ currentUserId, onSelectChat }: SidebarProps) {
  const [searchName, setSearchName] = useState('');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  const handleSearch = async () => {
    setFoundUser(null);
    const q = query(collection(db, "users"), where("username", "==", searchName.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data() as UserProfile;
      if (docData.uid === currentUserId) return alert("Du kan inte lägga till dig själv!");
      setFoundUser(docData);
    } else {
      alert("Hittade ingen användare med det namnet.");
    }
  };

  const sendRequest = async () => {
    if (!foundUser) return;
    
    await addDoc(collection(db, "friendships"), {
      userIds: [currentUserId, foundUser.uid],
      status: "pending",
      requestedBy: currentUserId,
      messages: [],
      lastRead: {
        [currentUserId]: 0,
        [foundUser.uid]: 0
      }
    });
    alert("Vänförfrågan skickad!");
    setFoundUser(null);
    setSearchName('');
  };

  const acceptRequest = async (id: string) => {
    const ref = doc(db, "friendships", id);
    await updateDoc(ref, { status: "accepted" });
  };

  const handleChatSelect = async (f: Friendship) => {
    onSelectChat(f.id);
    const totalMessages = f.messages ? f.messages.length : 0;
    const ref = doc(db, "friendships", f.id);
    await updateDoc(ref, {
      [`lastRead.${currentUserId}`]: totalMessages
    });
  };

  // STÄDAD OCH SÄKER EFFECT
  useEffect(() => {
    const q = query(collection(db, "friendships"), where("userIds", "array-contains", currentUserId));
    
    // Array för att hålla reda på alla aktiva användarlyssnare globalt i effekten
    let activeUserUnsubscribes: (() => void)[] = [];

    const unsubscribeFriendships = onSnapshot(q, (snapshot) => {
      // 1. Rensa ALLA gamla användarlyssnare direkt när grundlistan förändras
      activeUserUnsubscribes.forEach(unsub => unsub());
      activeUserUnsubscribes = [];

      const baseList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Friendship));

      // Sätt baslistan först så vi har något att visa
      setFriendships(baseList);

      // 2. Starta nya lyssnare för varje vän
      baseList.forEach((f) => {
        const friendId = f.userIds.find(id => id !== currentUserId);
        if (!friendId) return;

        const userDocRef = doc(db, "users", friendId);
        
        const unsubUser = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            
            setFriendships(prev => 
              prev.map(item => 
                item.id === f.id 
                  ? { 
                      ...item, 
                      friendUsername: userData.username,
                      friendStatus: userData.status || 'offline' 
                    } 
                  : item
              )
            );
          }
        });
        
        // Spara lyssnaren så den kan stängas av vid nästa uppdatering eller unmount
        activeUserUnsubscribes.push(unsubUser);
      });
    });

    // Stäng av ALLT när komponenten dör
    return () => {
      unsubscribeFriendships();
      activeUserUnsubscribes.forEach(unsub => unsub());
    };
  }, [currentUserId]);

  return (
    <aside className="sidebar" style={{ width: '300px', background: '#f5f5f5', padding: '15px' }}>
      <div className="search-section">
        <input type="text" placeholder="Sök användarnamn..." value={searchName} onChange={e => setSearchName(e.target.value)} />
        <button onClick={handleSearch}>Sök</button>
      </div>

      {foundUser && (
        <div style={{ background: '#fff', padding: '10px', marginTop: '10px', borderRadius: '5px' }}>
          <p>Hittad: <strong>{foundUser.username}</strong></p>
          <button onClick={sendRequest}>Lägg till vän</button>
        </div>
      )}

      <div className="relations-section" style={{ marginTop: '20px' }}>
        <h3>Dina relationer</h3>
        {friendships.map((f: Friendship) => {
          const isSender = f.requestedBy === currentUserId;
          const totalMessages = f.messages ? f.messages.length : 0;
          const readMessages = f.lastRead ? (f.lastRead[currentUserId] || 0) : 0;
          const unreadCount = totalMessages - readMessages;
          const isOnline = f.friendStatus === 'online';

          if (f.status === 'pending') {
            return (
              <div key={f.id} style={{ padding: '8px', background: '#ffeebb', margin: '5px 0', borderRadius: '5px' }}>
                {isSender ? (
                  <p>Förfrågan skickad till: <strong>{f.friendUsername || "Laddar..."}</strong></p>
                ) : (
                  <p>Förfrågan mottagen från: <strong>{f.friendUsername || "Laddar..."}</strong></p>
                )}
                {!isSender && <button onClick={() => acceptRequest(f.id)}>Acceptera</button>}
              </div>
            );
          }

          return (
            <div 
              key={f.id} 
              onClick={() => handleChatSelect(f)}
              style={{ 
                padding: '12px', 
                background: '#d3ffd3', 
                margin: '5px 0', 
                cursor: 'pointer', 
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isOnline ? '#4CAF50' : '#9E9E9E',
                  display: 'inline-block'
                }} />
                <span><strong>{f.friendUsername || "Laddar..."}</strong></span>
              </div>

              {unreadCount > 0 && (
                <span style={{ 
                  background: '#e91e63', 
                  color: '#fff', 
                  borderRadius: '50%', 
                  padding: '2px 8px', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}