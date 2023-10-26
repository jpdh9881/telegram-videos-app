import Fastify from 'fastify';
import root from "./root";
import channel from './channel/channel';
import message from './message/message';

export const initServer = () => {
  const server = Fastify({
    logger: true
  });

  // Register routes
  registerRoutes(server, [
    root,
    channel,
    message,
  ], { prefix: process.env.ROUTE_PREFIX ?? "" });

  return server;
};

const registerRoutes = (server, routes, options) => {
  for (const route of routes) {
    server.register(route, options);
  }
}