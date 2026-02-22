const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/feed", {
  auth: { userId: "696999ef-d3cf-4439-ba65-452d141c0f15" }
});

socket.on("connect", () => {
  console.log("Conectado!");
  socket.emit("registerLastSeen", {
    lastSeen: {
      id: "44adf0dc-2bf3-437b-9d6f-b5629f9fd18b",
      createdAt: "2024-06-01T12:00:00.000Z"
    }
  });
});

socket.on("unread_count", (data) => {
  console.log("Recibido unread_count:", data);
});