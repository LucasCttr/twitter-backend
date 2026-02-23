const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/feed", {
  auth: { userId: "696999ef-d3cf-4439-ba65-452d141c0f15" }
});

socket.on("connect", () => {
  console.log("Conectado!");
});

socket.on("likeNotification", (data) => {
  console.log("Recibido likeNotification:", data);
});

socket.on("followNotification", (data) => {
  console.log("Recibido followNotification:", data);
});