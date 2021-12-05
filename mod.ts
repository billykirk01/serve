import {
  serve as _serve,
  serveTls as _serveTls,
  Status,
  STATUS_TEXT,
} from "https://deno.land/std/http/mod.ts";
import * as _path from "https://deno.land/std/path/mod.ts";
import { walk } from "https://deno.land/std/fs/mod.ts";
import handlebars from "https://cdn.skypack.dev/handlebars";
import { lookup } from "https://deno.land/x/media_types/mod.ts";
import { prettyBytes } from "https://deno.land/x/pretty_bytes/mod.ts";

type PathParams = Record<string, string> | undefined;

interface Routes {
  [path: string]: Handler;
}

type Handler = (
  request: Request,
  params: PathParams,
) => Response | Promise<Response>;

/** Invokes the provided route handler for the route with the request as first argument and processed path params as the second.
 *
 * @example
 * ```ts
 * serve(8000, {
 *     // you can serve plain text
 *     "/hello": () => new Response("Hello World!"),
 *
 *     // json
 *     "/json": () => json({message: "hello world"}),
 *
 *     // a single file
 *     "/": serveStatic("./public/index.html"),
 *
 *     // a directory of files (browsing to /public will present a directory listing)
 *     "/public/:filename?": serveStatic("./public"),
 *
 *     // or a remote resource
 *     "/todos/:id": serveRemote("https://jsonplaceholder.typicode.com/todos/:id"),
 * });
 * ```
 */
export function serve(port: number, routes: Routes): void {
  console.log(`Server is starting at localhost:${port}`);
  _serve(handleRequests(routes), { addr: `:${port}` });
}

export function serveTLS(
  port: number,
  routes: Routes,
  certFile: string,
  keyFile: string,
): void {
  console.log(`Server is starting at localhost:${port}`);
  _serveTls(handleRequests(routes), { addr: `:${port}`, certFile, keyFile });
}

function handleRequests(routes: Routes) {
  return async (request: Request) => {
    let { pathname } = new URL(request.url);
    if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);

    let response: Response | undefined;

    try {
      const startTime = Date.now();
      for (const route of Object.keys(routes)) {
        const pattern = new URLPattern({ pathname: route });
        if (pattern.test({ pathname })) {
          const params = pattern.exec({ pathname })?.pathname.groups;
          response = await routes[route](request, params);
          break;
        }
      }

      console.log(
        `${request.method} ${pathname} ${Date.now() - startTime}ms ${
          response?.status || Status.InternalServerError
        }`,
      );

      return response ||
        json({ error: STATUS_TEXT.get(Status.NotFound) }, {
          status: Status.NotFound,
        });
    } catch (error) {
      console.error("Error serving request:", error);
      return json({ error: STATUS_TEXT.get(Status.InternalServerError) }, {
        status: Status.InternalServerError,
      });
    }
  };
}

/** Serve static files or a directory.
 *
 * @example
 * ```
 * serve(8000, {
 *     // a single file
 *     "/": serveStatic("./public/index.html"),
 *
 *     // a directory of files
 *     "/public/:filename?": serveStatic("./public"),
 * });
 * ```
 */
export function serveStatic(
  path: string,
): Handler {
  return async (
    request: Request,
    params: PathParams,
  ): Promise<Response> => {
    try {
      const fullPath = (params && params.filename)
        ? _path.join(path, params.filename)
        : path;
      const fileInfo = await Deno.stat(fullPath);
      if (fileInfo.isDirectory) {
        return serveDir(request, path);
      } else {
        const body = await Deno.readFile(fullPath);
        const response = new Response(body);
        const contentType = lookup(path);
        if (contentType) {
          response.headers.set("content-type", contentType);
        }
        return response;
      }
    } catch (error) {
      if (error?.name == "NotFound") {
        return json({ error: STATUS_TEXT.get(Status.NotFound) }, {
          status: Status.NotFound,
        });
      }
      return json({ error: STATUS_TEXT.get(Status.InternalServerError) }, {
        status: Status.InternalServerError,
      });
    }
  };
}

interface DirectoryEntry {
  path: URL;
  name: string;
  size: string;
  dateModified: string;
}

async function serveDir(request: Request, path: string) {
  const directoryData: DirectoryEntry[] = [];

  for await (const entry of walk(path, { includeDirs: false })) {
    const fileInfo = await Deno.stat(entry.path);
    const { size, mtime } = fileInfo;
    directoryData.push({
      path: new URL(entry.path, request.url),
      name: entry.name,
      size: prettyBytes(size),
      dateModified: `${mtime}`,
    });
  }

  const template = handlebars.compile(
    await Deno.readTextFile("./dirlisting.html"),
  );

  const rendered = template({
    directory: path,
    files: directoryData,
  });

  const response = new Response(rendered);
  response.headers.set("content-type", "text/html; charset=utf-8");
  return response;
}

/** Serve a remote resource.
 *
 * @example
 * ```
 * serve(8000, {
 *   "/todos/:id": serveRemote("https://jsonplaceholder.typicode.com/todos/:id"),
 * });
 * ```
 */
export function serveRemote(
  remoteURL: string,
): Handler {
  return (
    request: Request,
    _params: PathParams,
  ): Promise<Response> => {
    const { pathname } = new URL(request.url);
    const url = new URL(pathname, remoteURL);
    return fetch(url);
  };
}

/** Converts an object literal to a JSON string and returns
 * a Response with `application / json` as the `content - type`.
 *
 * @example
 * serve({
 *  "/": () => json({message: "hello world"}),
 * })
 * ```
 */
export function json(
  jsobj: Parameters<typeof JSON.stringify>[0],
  init?: ResponseInit,
): Response {
  const headers = init?.headers instanceof Headers
    ? init.headers
    : new Headers(init?.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(jsobj) + "\n", {
    statusText: init?.statusText ?? STATUS_TEXT.get(init?.status ?? Status.OK),
    status: init?.status ?? Status.OK,
    headers,
  });
}
