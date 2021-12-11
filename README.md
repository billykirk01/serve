# ✨ verse

A lightweight tool for serving http built on top of the Deno standard library.

This project takes much inspiration from the
[sift](https://github.com/satyarohith/sift) Deno project so thank you
[@satyarohith](https://github.com/satyarohith) for that work.

## 📦 Importing

```typescript
import {
  json,
  serve,
  serveRemote,
  serveStatic,
  serveTLS,
} from "https://deno.land/x/verse/mod.ts";
```

## 📖 Example Usage

```typescript
serve(8000, {
  // you can serve plain text
  "/hello": () => new Response("Hello World!"),

  // json
  "/json": () => json({ message: "hello world" }),

  // a single file
  "/": serveStatic("./public/index.html"),

  // a markdown file rendered in github flavored html
  "/markdown": serveMarkdown(".public/README.md")

  // a directory of files (browsing to /public will present a directory listing page)
  // note: must include :filename? at end of the path as below
  "/public/:filename?": serveStatic("./public"),

  // or a remote resource
  "/todos/:id": serveRemote("https://jsonplaceholder.typicode.com/todos/:id"),
});
```

Or over TLS

```typescript
serveTLS(
  8080,
  "/path/to/cert/localhost.crt",
  "/path/to/key/localhost.key",
  {
    "/hello": () => new Response("Hello World!"),
  },
);
```
