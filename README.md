# ✨ serve

A lightweight tool for creating github flavored HTML documents from markdown.
Built using Deno.

## 📦 Importing

```typescript
import {
  json,
  serve,
  serveStatic,
} from "https://raw.githubusercontent.com/wkirk01/serve/master/mod.ts";
```

## 📖 Example Usage

```typescript
serve(8000, {
  // you can serve plain text
  "/hello": () => new Response("Hello World!"),

  // json
  "/json": () => json({ message: "hello world" }),

  // a single file.
  "/": serveStatic("public/index.html"),

  // a directory of files.
  "/public/:filename+": serveStatic("public"),

  // or a remote resource.
  "/todos": serveStatic("https://jsonplaceholder.typicode.com/todos/1", false),
});
```
