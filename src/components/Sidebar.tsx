import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

interface SidebarProps {
  currentUserId: string;
  onSelectChat: (id: string) => void;
  onContactDeleted: (id: string) => void;
  activeChatId: string | null;
  isSidebarOpen: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
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
  status: 'pending' | 'accepted' | 'blocked';
  requestedBy: string;
  messages?: { senderId: string; text: string; createdAt?: number }[];
  lastRead?: Record<string, number>;
  friendUsername?: string;
  friendStatus?: 'online' | 'offline';
  blockedBy?: string;
}


export default function Sidebar({
  currentUserId,
  onSelectChat,
  onContactDeleted,
  activeChatId,
  isSidebarOpen,
  isDarkMode,
  onToggleTheme
}: SidebarProps) {

  const [searchName,setSearchName] = useState('');

  const [foundUser,setFoundUser] = useState<UserProfile|null>(null);
  const [friendships,setFriendships] = useState<Friendship[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);


  const handleSearch = async () => {

    setFoundUser(null);

    const q = query(
      collection(db,"users"),
      where("username","==",searchName.toLowerCase().trim())
    );

    const snap = await getDocs(q);

    if(!snap.empty){

      const data = snap.docs[0].data() as UserProfile;

      if(data.uid === currentUserId){
        return alert("You can’t add yourself!");
      }

      setFoundUser(data);

    }else{
      alert("No user found");
    }
  };



  const sendRequest = async()=>{

    if(!foundUser)return;
    if (isSendingRequest) return;

    setIsSendingRequest(true);

    try {
      const existing = friendships.find(friendship =>
        friendship.userIds.includes(foundUser.uid)
      );

      if (existing) {
        const existingStatus = existing.status;
        alert(
          existingStatus === 'blocked'
            ? 'You are already blocked or already connected.'
            : 'This person is already in your contacts or has a pending request.'
        );
        return;
      }

      await addDoc(collection(db,"friendships"),{
        userIds:[
          currentUserId,
          foundUser.uid
        ],
        status:"pending",
        requestedBy:currentUserId,
        messages:[],
        lastRead:{
          [currentUserId]:0,
          [foundUser.uid]:0
        }
      });

      setFoundUser(null);
      setSearchName('');

      alert("Friend request sent");
    } catch (error) {
      console.error('Failed to add friend:', error);
      alert('Could not send the friend request. Please try again.');
    } finally {
      setIsSendingRequest(false);
    }

  };



  const acceptRequest = async(id:string)=>{
    try {
      await updateDoc(
        doc(db,"friendships",id),
        {
          status:"accepted"
        }
      );
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      alert('Could not accept the friend request. Please try again.');
    }

  };


  const removeContact = async (f: Friendship) => {
    await deleteDoc(doc(db, 'friendships', f.id));
    onContactDeleted(f.id);
    setOpenMenuId(null);
  };

  const toggleBlockContact = async (f: Friendship) => {
    const isBlockedByMe = f.status === 'blocked' && f.blockedBy === currentUserId;

    await updateDoc(
      doc(db, 'friendships', f.id),
      isBlockedByMe
        ? {
            status: 'accepted',
            blockedBy: null
          }
        : {
            status: 'blocked',
            blockedBy: currentUserId
          }
    );

    setOpenMenuId(null);
  };



  const handleChatSelect = async(f:Friendship)=>{
    const readCount = f.messages?.length || 0;

    await updateDoc(
      doc(db,"friendships",f.id),
      {
        [`lastRead.${currentUserId}`]: readCount
      }
    );

    setFriendships(prev =>
      prev.map(item =>
        item.id === f.id
          ? {
              ...item,
              lastRead: {
                ...(item.lastRead || {}),
                [currentUserId]: readCount
              }
            }
          : item
      )
    );

    onSelectChat(f.id);

  };




  useEffect(()=>{


    const q = query(
      collection(db,"friendships"),
      where("userIds","array-contains",currentUserId)
    );


    const unsubscribe =
    onSnapshot(q,(snapshot)=>{


      const list =
      snapshot.docs.map(d=>({
        id:d.id,
        ...d.data()
      } as Friendship));


      setFriendships(list);



      list.forEach(f=>{


        const friendId =
        f.userIds.find(
          id=>id!==currentUserId
        );


        if(!friendId)return;



        onSnapshot(
          doc(db,"users",friendId),
          snap=>{

            if(snap.exists()){

              const user =
              snap.data() as UserProfile;


              setFriendships(prev=>

                prev.map(item=>

                  item.id===f.id

                  ?{
                    ...item,
                    friendUsername:user.username,
                    friendStatus:user.status || "offline"
                  }

                  :item

                )

              );

            }

          }

        );

      });



    });


    return ()=>unsubscribe();


  },[currentUserId]);





return (

<>

<aside
className={
`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`
}
>


  <div className="sidebar-search">

<input

 placeholder="Search username..."

value={searchName}

onChange={
e=>setSearchName(e.target.value)
}

/>


  <button className="sidebar-action-button sidebar-action-button-secondary" onClick={handleSearch}>
  Search
</button>


</div>



{
foundUser &&

<div>

<p>
Found:
<strong>
{foundUser.username}
</strong>
</p>


<button className="sidebar-action-button" onClick={sendRequest} disabled={isSendingRequest}>
Add friend
</button>


</div>

}




<h3>Your contacts</h3>


{
friendships.map(f=>{


const isSender =
f.requestedBy===currentUserId;


const unread =
Math.max(
  0,
  (f.messages || []).length - (f.lastRead?.[currentUserId] || 0)
);

const isActiveChat = activeChatId === f.id;
const isBlockedByMe = f.status === 'blocked' && f.blockedBy === currentUserId;



if(f.status==="pending"){


return (

<div key={f.id}>


<p>

Request from:

<strong>
{f.friendUsername || "Loading"}
</strong>

</p>


{
!isSender &&
<button className="sidebar-action-button sidebar-action-button-secondary" onClick={()=>acceptRequest(f.id)}>
Accept
</button>
}


</div>

);

}





return (

<div

key={f.id}

className="sidebar-friend-card"

onClick={()=>handleChatSelect(f)}
role="button"
tabIndex={0}

>


<span className="sidebar-friend-status">

{f.friendStatus==="online"
?"🟢"
:"⚪"
}

</span>


<span className="sidebar-friend-info">

<strong>
{f.friendUsername || "Loading"}
</strong>

{f.status === 'blocked' && (
  <span className="blocked-label">Blocked</span>
)}

</span>



{
!isActiveChat && unread>0 &&

<span className="unread-badge" title={`${unread} unread messages`}>

{unread}

</span>

}


<button
type="button"
className="contact-menu-trigger"
onClick={(e) => {
  e.stopPropagation();
  setOpenMenuId(openMenuId === f.id ? null : f.id);
}}
aria-label="Open contact menu"
>
⋯
</button>

{openMenuId === f.id && (
  <div
    className="contact-menu"
    onClick={(e) => e.stopPropagation()}
  >
    <button
      type="button"
      className="contact-menu-item"
      onClick={() => removeContact(f)}
    >
      Delete contact
    </button>

    <button
      type="button"
      className="contact-menu-item"
      onClick={() => toggleBlockContact(f)}
    >
      {isBlockedByMe ? 'Unblock' : 'Block'}
    </button>
  </div>
)}



</div>

)


})

}



<button
  className="theme-toggle-btn sidebar-theme-toggle"
  onClick={onToggleTheme}
  type="button"
  aria-label={isDarkMode ? 'change to light mode' : 'change to dark mode'}
>
  {isDarkMode ? '☀️Light ' : '🌙 Dark'}
</button>

</aside>




{
isSidebarOpen &&

<div className="sidebar-overlay"></div>

}


</>

);

}