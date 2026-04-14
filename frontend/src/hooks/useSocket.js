import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const useSocket = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    // connection event
    socketRef.current.on("connect", () => {
      setConnected(true);
      console.log(`connected tp server: ${socketRef.current.id}`);
    });

    socketRef.current.on("disconnect", () => {
      setConnected(false);
    });
  }, []);
};

export default useSocket;
