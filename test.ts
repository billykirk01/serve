import {serve, serveStatic} from "./mod.ts";

serve(8000, {
    "/todos/:id": serveStatic("/todos/:id", "https://jsonplaceholder.typicode.com"),
});