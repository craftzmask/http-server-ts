import * as net from "net";

const server = net.createServer((socket: net.Socket) => {
  socket.setEncoding('utf-8');
  
  socket.on("data", (data: Buffer<ArrayBufferLike>) => {
    const requestLine: string = data.toString().split("\r\n")[0];
    const [method, target, version] = requestLine.split(" ");
    
    if (target == "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    }
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
