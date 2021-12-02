# ✨ serve

A lightweight tool for creating github flavored HTML documents from markdown.
Built using Deno.

## 📦 Importing

```typescript
import {
  json,
  serve,
  serveStatic,
} from "https://raw.githubusercontent.com/wkirk01/server/master/mod.ts";
```

## 📖 Example Usage

```typescript
serve(8000, {
  "/hello": () => new Response("Hello World!"),
  "/json": () => json({ message: "hello world" }),
  // You can serve a single file.
  "/": serveStatic("public/index.html"),
  // Or a directory of files.
  "/public/:filename+": serveStatic("public"),
  // Or a remote resource.
  "/todos": serveStatic("https://jsonplaceholder.typicode.com/todos/1", false),
});
```
