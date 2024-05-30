import React, { useEffect, useRef, useState } from "react"
import socket from "./socket"
import SimplePeer from "simple-peer"

function App() {
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")
  const [stream, setStream] = useState(null)
  const [callToId, setCallToId] = useState("")
  const [myId, setMyId] = useState("")
  const [ringing, setRinging] = useState(false) // State to control ringing
  const myAudio = useRef()
  const userAudio = useRef()
  const ringtone = useRef() // Ref for the ringtone audio element
  const connectionRef = useRef()

  useEffect(() => {
    // Set user ID when socket connects
    socket.on("connect", () => {
      console.log("Connected to socket with ID:", socket.id)
      setMyId(socket.id)
    })

    socket.on("message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message])
    })

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setStream(stream)
        myAudio.current.srcObject = stream
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error)
      })

    socket.on("callUser", ({ from, signal }) => {
      setRinging(true) // Start ringing when call received
      if (ringtone.current) {
        ringtone.current.play() // Play the ringtone if ref is assigned
      }
      const peer = new SimplePeer({ initiator: false, trickle: false, stream })

      peer.on("signal", (data) => {
        socket.emit("answerCall", { signal: data, to: from })
      })

      peer.on("stream", (stream) => {
        userAudio.current.srcObject = stream
      })

      peer.signal(signal)
      connectionRef.current = peer
    })

    socket.on("callAccepted", () => {
      setRinging(false) // Stop ringing when call accepted
      if (ringtone.current) {
        ringtone.current.pause() // Pause the ringtone if ref is assigned
        ringtone.current.currentTime = 0 // Reset the ringtone to start
      }
    })

    return () => {
      socket.off("message")
      socket.off("callUser")
      socket.off("connect")
    }
  }, [stream])

  const callUser = (id) => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setStream(stream)
        myAudio.current.srcObject = stream

        const peer = new SimplePeer({ initiator: true, trickle: false, stream })

        peer.on("signal", (data) => {
          socket.emit("callUser", {
            userToCall: id,
            signalData: data,
            from: socket.id,
          })
        })

        peer.on("stream", (stream) => {
          userAudio.current.srcObject = stream
        })

        socket.on("callAccepted", (signal) => {
          peer.signal(signal)
        })

        connectionRef.current = peer
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error)
      })
  }

  const sendMessage = () => {
    socket.emit("message", message)
    setMessage("")
  }

  return (
    <div>
      <h1>Chat</h1>
      <div>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        type="text"
      />
      <button onClick={sendMessage}>Send</button>
      <div>
        <audio playsInline muted ref={myAudio} autoPlay />
        <audio playsInline ref={userAudio} autoPlay />
        {/* Ringtone audio element */}
        {ringing && <audio ref={ringtone} src="/ringtone.mp3" loop />}
      </div>
      <div>
        <input
          value={callToId}
          onChange={(e) => setCallToId(e.target.value)}
          placeholder="Enter user ID to call"
        />
        <button onClick={() => callUser(callToId)}>Call User</button>
      </div>
      <div>Your ID: {myId}</div>
    </div>
  )
}

export default App
