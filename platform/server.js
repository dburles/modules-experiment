import { serve } from 'https://deno.land/std@v0.3.4/http/server.ts';
import { contentType } from 'https://deno.land/std@v0.3.4/media_types/mod.ts';
import { extname } from 'https://deno.land/std@v0.3.4/fs/path.ts';
const { stat, open, cwd } = Deno;
import router from './router/router.js';

function html ({ script, body, hydrate }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Page Title</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="client.js" type="module"></script>
  <script src="${script}" type="module"></script>
  <script>
  const hydrate = ${hydrate};
  </script>
</head>
<body>
  <div id="root">${body}</div>
</body>
</html>`;
}

async function serve_file (filename) {
  const file = await open(filename);
  const file_info = await stat(filename);
  const headers = new Headers();
  headers.set('content-length', file_info.len.toString());
  headers.set('content-type', contentType(extname(filename)) || 'text/plain');
  const res = {
    status: 200,
    body: file,
    headers
  };
  return res;
}

function resolve_file (url) {
  return cwd() + '/src' + url;
}

const host = 'localhost';
const port = 3000;
const s = serve(`${host}:${port}`);

async function server ({ routes }) {
  console.log(`Server running on http://${host}:${port}`);
  
  const get_route = router(routes);

  for await (const req of s) {
    // console.log(req.method, req.url);

    const route = get_route(req.url);
    
// If we find a route, serve the route.
    if (route !== undefined) {
// Provide server rendered data, also used for hydration.
      const props = {
// Router parameters.
        params: route.params,
// Async data.
        ...(typeof route.module_data === 'function') && {
          data: await route.module_data()
        }
      };
// Render the html.
      const page = html({
// `script:` Entry point goes into <head>.
        script: route.module_name,
        body: route.module(props),
        hydrate: JSON.stringify(props)
      });
      req.respond({ body: new TextEncoder().encode(page) });
    } else {
// Serve platform specific files.
// TODO: Make this better.
      if (/\/platform/.test(req.url)) {
        req.respond(await serve_file(cwd() + req.url));
      } else {
// Otherwise, serve files.
// XXX: SECURE?
        try {
          req.respond(await serve_file(resolve_file(req.url)));
        } catch (error) {
          console.log(req.url, '404');
          req.respond({ status: 404, body: new TextEncoder().encode('404: Not found.') });
        }
      }
    }
  }
}

export default server;
