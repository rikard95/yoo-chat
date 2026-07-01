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
  updateDoc
} from 'firebase/firestore';

interface SidebarProps {
  currentUserId: string;
  onSelectChat: (id: string) => void;
  isSidebarOpen: boolean;
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


export default function Sidebar({
  currentUserId,
  onSelectChat,
  isSidebarOpen
}: SidebarProps) {

  const [searchName,setSearchName] = useState('');
  const [foundUser,setFoundUser] = useState<UserProfile|null>(null);
  const [friendships,setFriendships] = useState<Friendship[]>([]);


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
        return alert("Du kan inte lägga till dig själv!");
      }

      setFoundUser(data);

    }else{
      alert("Hittade ingen användare");
    }
  };



  const sendRequest = async()=>{

    if(!foundUser)return;


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

    alert("Vänförfrågan skickad");

  };



  const acceptRequest = async(id:string)=>{

    await updateDoc(
      doc(db,"friendships",id),
      {
        status:"accepted"
      }
    );

  };



  const handleChatSelect = async(f:Friendship)=>{

    onSelectChat(f.id);


    await updateDoc(
      doc(db,"friendships",f.id),
      {
        [`lastRead.${currentUserId}`]:
        f.messages?.length || 0
      }
    );

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

placeholder="Sök användarnamn..."

value={searchName}

onChange={
e=>setSearchName(e.target.value)
}

/>


<button onClick={handleSearch}>
Sök
</button>


</div>



{
foundUser &&

<div>

<p>
Hittad:
<strong>
{foundUser.username}
</strong>
</p>


<button onClick={sendRequest}>
Lägg till vän
</button>


</div>

}




<h3>Dina relationer</h3>


{
friendships.map(f=>{


const isSender =
f.requestedBy===currentUserId;


const unread =
(f.messages?.length || 0)
-
(f.lastRead?.[currentUserId] || 0);



if(f.status==="pending"){


return (

<div key={f.id}>


<p>

Förfrågan från:

<strong>
{f.friendUsername || "Laddar"}
</strong>

</p>


{
!isSender &&
<button onClick={()=>acceptRequest(f.id)}>
Acceptera
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

>


<span>

{f.friendStatus==="online"
?"🟢"
:"⚪"
}

{" "}

<strong>
{f.friendUsername || "Laddar"}
</strong>

</span>



{
unread>0 &&

<span className="unread-badge">

{unread}

</span>

}



</div>

)


})

}



</aside>



{
isSidebarOpen &&

<div className="sidebar-overlay"></div>

}


</>

);

}