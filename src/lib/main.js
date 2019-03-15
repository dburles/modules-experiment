import { subscribe } from './router/router-client.js';
import routes from '../routes.js';
import router from './router/router.js';

const get_route = router(routes);

// This represents one entire view mounted at the root element.
let unmount;

// The props for the entire view.
let props;

// Mount event handlers on initial page load from SSR.
document.addEventListener('DOMContentLoaded', async function () {
  const route = get_route(window.location.pathname);
  const { default: handler_factory } = await import(`${route.module_name}_handler.js`);
  const handler = await handler_factory();
  unmount = handler.mount();
  props = hydrate;
  console.log('DOMContentLoaded', { hydrate });
});

subscribe(async function ({ path, params }) {
  console.log('route', { path, params });
  const route = get_route(path);
  // Dynamically import and render based on route.
  const { default: view } = await import(`${route.module_name}.js`);
  const { default: handler_factory } = await import(`${route.module_name}_handler.js`);
  // TODO: if there is data for this route, it's passed in via the route.
  const { default: data } = await import(`${route.module_name}_data.js`);
  const handler = await handler_factory();
  props = { // Render into view.
    params,
    data: await data()
  };
  handler.render(props);
});

function create_handler (view, func) {
  return async function handler () {
    const { navigate } = await import('./router/router-client.js');
    const mount = func({ render, navigate });
    async function render(new_props = {}) {
      console.log('called render for ', view.name, props);
      // const { default: view } = await import(module_name);
      unmount(); // Unmount.
      document.getElementById('root').innerHTML = view({ ...props, ...new_props });
      unmount = mount(); // Mount new event handlers.
    }
    // being explicit here for clarity.
    return { mount, render };
  }
}

export default create_handler;
