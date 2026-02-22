const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/feed");

socket.on("connect", () => {
  console.log("Conectado!");
  socket.emit("registerLastSeen", {
    lastSeen: {
      id: "44adf0dc-2bf3-437b-9d6f-b5629f9fd18b",
      createdAt: "2024-06-01T12:00:00.000Z" // Usa una fecha realista
    }
  });
});

socket.on("newTweetsAvailable", (data) => {
  console.log("Nuevos tweets recibidos en el cliente:", data.count);
});