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
import { markdownToHTML } from "https://deno.land/x/md2html/mod.ts";
import { MatchHandler } from "https://crux.land/router@0.0.5";

type PathParams = Record<string, string> | undefined;

// type Handler = (
//   request: Request,
//   params: PathParams,
// ) => Response | Promise<Response>;

/** Serve static files or a directory.
 *
 * @example
 * ```
 * // a single file
 * "/": serveStatic("./public/index.html"),
 *
 * // a directory of files
 * "/public/:filename?": serveStatic("./public"),
 * ```
 */
export function serveStatic(
  path: string,
): MatchHandler {
  return async (
    request: Request,
    params: Record<string, string> | undefined,
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
 * "/todos/:id": serveRemote("https://jsonplaceholder.typicode.com/todos/:id"),
 * ```
 */
export function serveRemote(
  remoteURL: string,
): MatchHandler {
  return (
    request: Request,
    _params: Record<string, string> | undefined,
  ): Promise<Response> => {
    const { pathname } = new URL(request.url);
    const url = new URL(pathname, remoteURL);
    return fetch(url);
  };
}

/** Serve a markdown file as github flavored html.
 *
 * @example
 * ```
 * serve(8000, {
 *   "/markdown": serveRemote("./README.md"),
 * });
 * ```
 */
export function serveMarkdown(
  resource: string | URL,
): MatchHandler {
  return async (
    _request: Request,
    _params: Record<string, string> | undefined,
  ): Promise<Response> => {
    const response = new Response(await markdownToHTML(resource));
    response.headers.set("content-type", "text/html; charset=utf-8");
    return response;
  };
}

/** Converts an object literal to a JSON string and returns
 * a Response with `application / json` as the `content - type`.
 *
 * @example
 * serve(8000, {
 *  "/": () => json({message: "hello world"}),
 * })
 * ```
 */
export function serveJson(
  jsonObj: Parameters<typeof JSON.stringify>[0],
  init?: ResponseInit,
): MatchHandler {
  return (
    _request: Request,
    _params: Record<string, string> | undefined,
  ): Response => {
    return json(jsonObj, init);
  };
}

function json(
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
