import io from "socket.io-client"

const socket = io("https://chat-app-server-qear.onrender.com", {
  transports: ["websocket"],
})

export default socket
