import * as net from "net";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";

interface HttpRequest {
  method: string;
  target: string;
  version: string;
  headers: Record<string, string>;
  body: string | Buffer
}

interface HttpResponse {
  version: string;
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: string | Buffer;
}

function parseRequest(rawRequest: Buffer<ArrayBufferLike>): HttpRequest {
  const [rawHeaders, body = ""] = rawRequest.toString().split("\r\n\r\n");
  const [requestLine, ...headerLines] = rawHeaders.toString().split("\r\n");
  const [method, target, version] = requestLine.split(" ");

  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const [key, value] = line.split(": ");
    if (key && value) {
      headers[key] = value;
    }
  }

  return { method, target, version, headers, body };
}

function formatResponse(res: HttpResponse): Buffer {
  const statusLine: string = `${res.version} ${res.statusCode} ${res.statusMessage}`;
  const headerLines: string = Object.entries(res.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\r\n");

  const head = `${statusLine}\r\n${headerLines}\r\n\r\n`;
  const headBuffer = Buffer.from(head, "utf-8");

  const bodyBuffer = typeof res.body === "string"
    ? Buffer.from(res.body, "utf-8")
    : res.body
  
  return Buffer.concat([headBuffer, bodyBuffer]);
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

async function handleRequest(request: HttpRequest): Promise<HttpResponse> {
  const { method, target, headers, body } = request

  if (target == "/") {
    return createResponse({});
  }
  
  if (target.startsWith("/echo/")) {
    const msg: string = target.substring("/echo/".length);
    const res: HttpResponse = createResponse({
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": msg.length.toString(),
      },
      body: msg
    });

    if (headers["Accept-Encoding"]?.includes("gzip")) {
      res.body = Buffer.from(Bun.gzipSync(msg));
      res.headers["Content-Encoding"] = "gzip";
      res.headers["Content-Length"] = res.body.length.toString();
    }

    return res;
  }
  
  if (target === "/user-agent") {
    const userAgent = headers["User-Agent"];
    return createResponse({
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": userAgent.length.toString(),
      },
      body: userAgent
    });
  }
  
  if (target.startsWith("/files/")) {
    const dirPath: string = process.argv[3];
    const filename: string = target.substring("/files/".length);
    const path: string = `${dirPath}/${filename}`;

    if (method === "POST") {
      writeFile(path, body);
      return createResponse({
        statusCode: 201,
        statusMessage: "Created"
      })
    } else if (method === "GET") {
      if (existsSync(path)) {
        const content = await readFile(path, "utf-8");
        return createResponse({
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": content.length.toString()
          },
          body: content
        });
      }
    }
  }

  return createResponse({
    statusCode: 404,
    statusMessage: "Not Found"
  });
}

const server = net.createServer((socket: net.Socket) => {
  socket.setEncoding('utf-8');
  
  socket.on("data", async (rawRequest: Buffer<ArrayBufferLike>) => {
    const request: HttpRequest = parseRequest(rawRequest);
    const response: HttpResponse = await handleRequest(request);
    
    socket.write(formatResponse(response));
  });
});

server.listen(4221, "localhost");
