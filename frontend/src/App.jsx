import useSocket from "./hooks/useSocket";

function App() {
  const { socket, connected } = useSocket();
  return (
    <>
      <h1>Welcome to the App! {connected ? "Connected" : "Not Connected"}</h1>
      <h1>{socket?.current?.id}</h1>
    </>
  );
}

export default App;
