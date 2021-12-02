# ✨ verse

A lightweight tool for serving http built on top of the Deno standard library.

This project takes much inspiration from the
[sift](https://github.com/satyarohith/sift) Deno project so thank you
[@satyarohith](https://github.com/satyarohith) for that work.

## 📦 Importing

```typescript
import { json, serve, serveStatic } from "https://deno.land/x/verse/mod.ts";
```

## 📖 Example Usage

```typescript
serve(8000, {
  // you can serve plain text
  "/hello": () => new Response("Hello World!"),

  // json
  "/json": () => json({ message: "hello world" }),

  // a single file
  "/": serveStatic("public/index.html"),

  // a directory of files
  "/public/:filename+": serveStatic("public"),

  // or a remote resource
  "/todos/:id": serveStatic(
    "/todos/:id",
    "https://jsonplaceholder.typicode.com",
  ),
});
```
