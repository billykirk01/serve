import {
    Status,
    STATUS_TEXT,
} from "https://deno.land/std/http/http_status.ts";

import {
    contentType as getContentType,
    lookup,
} from "https://deno.land/x/media_types/mod.ts";

import {serve as _serve} from "https://deno.land/std/http/server.ts";

type PathParams = Record<string, string> | undefined;

interface Routes {
    [path: string]: Handler;
}

export type Handler = (
    request: Request,
    params: PathParams,
) => Response | Promise<Response>;

/** Invokes the provided route handler for the route with the request as first argument and processed path params as the second.
 *
 * @example
 * ```ts
 * serve({
 *  "/": (request: Request) => new Response("Hello World!"),
 * })
 * ```
 */
export function serve(port: number, routes: Routes): void {
    console.log(`Server is starting at localhost:${ port }`);
    _serve(handleRequests(routes), {addr: `:${ port }`});
}

function handleRequests(routes: Routes) {
    return async (request: Request) => {
        const {pathname} = new URL(request.url);

        let response: Response | undefined;

        try {
            const startTime = Date.now();
            for (const route of Object.keys(routes)) {
                const pattern = new URLPattern({pathname: route});
                if (pattern.test({pathname})) {
                    const params = pattern.exec({pathname})?.pathname.groups;
                    try {
                        response = await routes[route](request, params);
                    } catch (error) {
                        console.error("Error serving request:", error);
                        response = json({error: error.message}, {status: 500});
                    }
                    break;
                }
            }

            // return not found page if no handler is found.
            if (response === undefined) {
                response = json({error: "Page not found"}, {status: 404});
            }

            // method path+params timeTaken status
            console.log(
                `${ request.method } ${ pathname } ${ Date.now() - startTime }ms ${ response.status }`,
            );

            return response;
        } catch (error) {
            console.error("Error serving request:", error);
            return json({error: error.message}, {status: 500});
        }
    };

}

/** Serve static files hosted on the internet or relative to your source code.
 *
 * @example
 * ```
 * serve(8000, {
 *     // You can serve a single file.
 *     "/": serveStatic("public/index.html"),
 *     // Or a directory of files.
 *     "/public/:filename+": serveStatic("public"),
 *     // Or a remote resource.
 *     "/todos/:id": serveStatic("/todos/:id", "https://jsonplaceholder.typicode.com"),,
 * });
 * ```
 */
export function serveStatic(
    path: string,
    baseURL: string,
): Handler {
    return async (
        request: Request,
        params: PathParams,
    ): Promise<Response> => {
        if (baseURL) {
            const {pathname} = new URL(request.url);
            const url = new URL(pathname, baseURL);
            return fetch(url);
        } else {
            const filename = params?.filename;
            let filePath = path;
            if (filename) {
                filePath = path.endsWith("/")
                    ? path + filename
                    : path + "/" + filename;
            }
            const fileUrl = new URL(filePath, import.meta.url);
            const body = await Deno.readFile(fileUrl);
            const response = new Response(body);
            const contentType = getContentType(String(lookup(filePath)));
            if (contentType) {
                response.headers.set("content-type", contentType);
            }

            if (response.status == 404) {
                return json({error: "Page not found"}, {status: 404});
            }
            return response;
        }
    };
}

/** Converts an object literal to a JSON string and returns
 * a Response with `application / json` as the `content - type`.
 *
 * @example
 * ```js
    * import {serve, json} from "https://deno.land/x/sift/mod.ts"
 *
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
