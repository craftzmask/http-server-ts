import * as net from "net";

const server = net.createServer((socket: net.Socket) => {
  socket.setEncoding('utf-8');
  
  socket.on("data", (data: Buffer<ArrayBufferLike>) => {
    const requestLine: string = data.toString().split("\r\n")[0];
    const [method, target, version] = requestLine.split(" ");
    
    let response = "HTTP/1.1 404 Not Found\r\n\r\n";
    if (target == "/") {
      response = "HTTP/1.1 200 OK\r\n\r\n";
    } else if (target.startsWith("/echo/")) {
      const param: string = target.substring("/echo/".length);
      response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${param.length}\r\n\r\n${param}`
    }
    
    socket.write(response);
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
