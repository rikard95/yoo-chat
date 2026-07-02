// src/components/ChatArea.tsx
import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';

interface ChatAreaProps {
  currentUserId: string;
  activeChatId: string | null;
}

// 1. Define the internal message schema
interface Message {
  senderId: string;
  text?: string;
  timestamp: string;
  attachment?: {
    url: string;
    name: string;
    mimeType: string;
    kind: 'image' | 'audio' | 'file';
  };
}

// 2. Define the structural schema for your Friendship document
interface FriendshipDoc {
  id: string;
  status: 'pending' | 'accepted' | 'blocked';
  messages?: Message[];
  users?: string[];
  lastRead?: Record<string, number>; // Lagt till för att hantera olästa meddelanden
  blockedBy?: string | null;
}

export default function ChatArea({ currentUserId, activeChatId }: ChatAreaProps) {
  const [friendship, setFriendship] = useState<FriendshipDoc | null>(null);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [friendship?.messages?.length, activeChatId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChatId || !friendship) return;

    const chatRef = doc(db, "friendships", activeChatId);
    const newTotalMessages = (friendship.messages || []).length + 1;

    await updateDoc(chatRef, {
      messages: arrayUnion({
        senderId: currentUserId,
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }),
      [`lastRead.${currentUserId}`]: newTotalMessages
    });

    setText('');
  };

  if (!activeChatId) return <div style={{ flex: 1, padding: '20px' }}>Select an approved friend in the menu to start chatting.</div>;
  if (!friendship) return <div style={{ flex: 1, padding: '20px' }}>Loading chat...</div>;

  // SPÄRREN: Om någon på något sätt öppnar en chatt som är 'pending'
  if (friendship.status === 'pending') {
    return (
      <div className="chat-status-panel chat-status-panel-pending">
        🛑 You can’t send messages until the other person accepts your request.
      </div>
    );
  }

  if (friendship.status === 'blocked') {
    const blockedByMe = friendship.blockedBy === currentUserId;

    return (
      <div className="chat-status-panel chat-status-panel-blocked">
        {blockedByMe
          ? 'You have blocked this contact.'
          : 'This contact has blocked you.'}
      </div>
    );
  }

  const messages = friendship.messages || [];

  return (
    <section className="chat-area">
      <div className="chat-messages">
        {messages.map((m: Message, index: number) => {
          const isMe = m.senderId === currentUserId;
          const hasText = Boolean(m.text && m.text.trim());
          const attachment = m.attachment;
          return (
            <div key={index} className={`message-row ${isMe ? 'message-row-me' : 'message-row-friend'}`}>
              <span className={`message-bubble ${isMe ? 'message-bubble-me' : 'message-bubble-friend'}`}>
                {hasText && <div className="message-text">{m.text}</div>}
                {attachment && attachment.kind === 'image' && (
                  <a className="message-attachment-link" href={attachment.url} target="_blank" rel="noreferrer">
                    <img className="message-image" src={attachment.url} alt={attachment.name} />
                  </a>
                )}
                {attachment && attachment.kind === 'audio' && (
                  <div className="message-audio-wrap">
                    <audio controls className="message-audio">
                      <source src={attachment.url} type={attachment.mimeType} />
                    </audio>
                  </div>
                )}
                {attachment && attachment.kind === 'file' && (
                  <a className="message-file-link" href={attachment.url} download={attachment.name}>
                    {attachment.name}
                  </a>
                )}
                {attachment && (
                  <a className="message-download-link" href={attachment.url} download={attachment.name}>
                    Download
                  </a>
                )}
                <div className="message-time">{m.timestamp}</div>
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-container" onSubmit={sendMessage}>
        { /*
          Future attachment support:
          <label className="attachment-button">
            Add file
            <input type="file" accept="image/*,audio/*,.mp3,.wav" />
          </label>
        */ }
        <input 
          className="chat-input"
          type="text" 
          placeholder="Write a message..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
          maxLength={500}
        />
        <button className="send-button" type="submit">Send</button>
      </form>
    </section>
  );
}