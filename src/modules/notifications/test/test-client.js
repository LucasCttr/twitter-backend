const { io } = require("socket.io-client");

// Conectar al servidor de Socket.IO con el userId en la autenticación
const socket = io("http://localhost:3000/feed", {
  auth: { userId: "696999ef-d3cf-4439-ba65-452d141c0f15" }
});

socket.on("connect", () => {
  console.log("Conectado!");
});

// Escuchar eventos de notificación
socket.on("likeNotification", (data) => {
  console.log("Recibido likeNotification:", data);
});

// Escuchar eventos de notificación de seguimiento
socket.on("followNotification", (data) => {
  console.log("Recibido followNotification:", data);
});

// Escuchar eventos de notificación de retweet
socket.on("retweetNotification", (data) => {
  console.log("Recibido retweetNotification:", data);
});