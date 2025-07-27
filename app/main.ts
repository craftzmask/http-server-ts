import * as net from "net";

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    socket.write("HTTP/1.1 200 OK\r\n\r\n");
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
