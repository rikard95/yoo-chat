// src/components/ChatArea.tsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';

interface ChatAreaProps {
  currentUserId: string;
  activeChatId: string | null;
}

// 1. Define the internal message schema
interface Message {
  senderId: string;
  text: string;
  timestamp: string;
}

// 2. Define the structural schema for your Friendship document
interface FriendshipDoc {
  id: string;
  status: 'pending' | 'accepted';
  messages?: Message[];
  users?: string[];
  lastRead?: Record<string, number>; // Lagt till för att hantera olästa meddelanden
}

export default function ChatArea({ currentUserId, activeChatId }: ChatAreaProps) {
  const [friendship, setFriendship] = useState<FriendshipDoc | null>(null);
  const [text, setText] = useState('');

  // Lyssna på den aktiva chatten/vänskapen
  useEffect(() => {
    if (!activeChatId) return;

    const docRef = doc(db, "friendships", activeChatId);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as FriendshipDoc;
        setFriendship(data);

        // Nollställ olästa meddelanden direkt om du har chatten öppen och ett nytt meddelande trillar in
        const totalMessages = data.messages ? data.messages.length : 0;
        const currentRead = data.lastRead ? (data.lastRead[currentUserId] || 0) : 0;

        if (totalMessages > currentRead) {
          await updateDoc(docRef, {
            [`lastRead.${currentUserId}`]: totalMessages
          });
        }
      }
    });

    return () => unsubscribe();
  }, [activeChatId, currentUserId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChatId || !friendship) return;

    const chatRef = doc(db, "friendships", activeChatId);
    const newTotalMessages = (friendship.messages || []).length + 1;
    
    // Vi lägger till meddelandet och sätter samtidigt ditt eget lastRead till det nya maxantalet
    await updateDoc(chatRef, {
      messages: arrayUnion({
        senderId: currentUserId,
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }),
      [`lastRead.${currentUserId}`]: newTotalMessages
    });

    setText('');
  };

  if (!activeChatId) return <div style={{ flex: 1, padding: '20px' }}>Välj en godkänd vän i menyn för att börja chatta.</div>;
  if (!friendship) return <div style={{ flex: 1, padding: '20px' }}>Laddar chatt...</div>;

  // SPÄRREN: Om någon på något sätt öppnar en chatt som är 'pending'
  if (friendship.status === 'pending') {
    return (
      <div style={{ flex: 1, padding: '20px', background: '#ffcccc', color: 'red' }}>
        🛑 Du kan inte skicka meddelanden förrän den andre har accepterat din förfrågan.
      </div>
    );
  }

  const messages = friendship.messages || [];

  return (
    <section className="chat-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div className="messages" style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#efeae2' }}>
        {messages.map((m: Message, index: number) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={index} style={{ 
              textAlign: isMe ? 'right' : 'left', 
              margin: '10px 0' 
            }}>
              <span style={{ 
                background: isMe ? '#d9fdd3' : '#fff', 
                padding: '8px 12px', 
                borderRadius: '10px',
                display: 'inline-block',
                boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
              }}>
                {m.text}
                <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>{m.timestamp}</div>
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} style={{ padding: '15px', display: 'flex', gap: '10px', borderTop: '1px solid #ccc' }}>
        <input 
          type="text" 
          placeholder="Skriv ett meddelande..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
          maxLength={500}
          style={{ flex: 1, padding: '10px' }}
        />
        <button type="submit">Skicka</button>
      </form>
    </section>
  );
}