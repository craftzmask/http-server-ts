import * as net from "net";

interface HttpRequest {
  method: string;
  target: string;
  version: string;
  headers: Record<string, string>;
}

interface HttpResponse {
  version: string;
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body?: string | Buffer;
}

function parseRequest(rawRequest: Buffer<ArrayBufferLike>): HttpRequest {
  const [requestLine, ...headerLines] = rawRequest.toString().split("\r\n");
  const [method, target, version] = requestLine.split(" ");

  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    if (line.trim() === "") break;
    const [key, value] = line.split(": ");
    headers[key] = value;
  }

  return { method, target, version, headers };
}

function formatResponse(res: HttpResponse): string {
  const statusLine: string = `${res.version} ${res.statusCode} ${res.statusMessage}`;
  const headerLines: string = Object.entries(res.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\r\n");
  
  const body: string = res.body?.toString() ?? "";
  return `${statusLine}\r\n${headerLines}\r\n\r\n${body}`;
}

function createResponse(overrides: Partial<HttpResponse>): HttpResponse {
  return {
    version: "HTTP/1.1",
    statusCode: 200,
    statusMessage: "OK",
    headers: {},
    body: "",
    ...overrides
  };
}

const server = net.createServer((socket: net.Socket) => {
  socket.setEncoding('utf-8');
  
  socket.on("data", (rawRequest: Buffer<ArrayBufferLike>) => {
    const request: HttpRequest = parseRequest(rawRequest);
    
    // Assume the response should be not found as default
    // so we don't have to handle in the if-else statements for clarify
    let response: HttpResponse = createResponse({
      statusCode: 404,
      statusMessage: "Not Found"
    });

    if (request.target == "/") {
      response = createResponse({});
    } else if (request.target.startsWith("/echo/")) {
      const param: string = request.target.substring("/echo/".length);
      response = createResponse({
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": param.length.toString(),
        },
        body: param
      });
    } else if (request.target === "/user-agent") {
      const userAgent = request.headers["User-Agent"];
      response = createResponse({
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": userAgent.length.toString(),
        },
        body: userAgent
      });
    }
    
    socket.write(formatResponse(response));
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
