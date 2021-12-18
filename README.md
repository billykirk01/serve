# ✨ verse

A lightweight tool for serving http built on top of the Deno standard library.

This project takes much inspiration from the
[sift](https://github.com/satyarohith/sift) Deno project so thank you
[@satyarohith](https://github.com/satyarohith) for that work.

## 📦 Importing

```typescript
import {
  serveJson,
  serveMarkdown,
  serveRemote,
  serveStatic,
} from "https://deno.land/x/verse/mod.ts";
```

## 📖 Example Usage

This package can be nicley paired with something like
[Router](https://crux.land/router@0.0.5) by
[Denosaurs](https://github.com/denosaurs)

```typescript
import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { router } from "https://crux.land/router@0.0.5";
import { serveJson, serveMarkdown, serveRemote, serveStatic } from "./mod.ts";

const handler = router({
  // a single file
  "/": serveStatic("./public/index.html"),

  // a directory of files (browsing to /public will present a directory listing page)
  // note: must include :filename? at end of the path as below
  "/public/:filename?": serveStatic("./public"),

  // json
  "/json": serveJson({ "Hello": "world" }),

  // a remote resource
  "/todos/:id": serveRemote("https://jsonplaceholder.typicode.com/todos/:id"),

  // a markdown file rendered in Github flavored html
  "/markdown": serveMarkdown(
    "https://raw.githubusercontent.com/billykirk01/verse/master/README.md",
  ),
});

console.log("Listening on http://localhost:8000");
await serve(handler);
```
