import Fastify from "fastify";
import root from "./root";
import channel from "./channel/channel";
import message from "./message/message";
import telegram from "./telegram/telegram";

export const initServer = () => {
  const server = Fastify({
    logger: true
  });

  // Register routes
  _registerRoutes(server, [
    root,
    channel,
    message,
    telegram,
  ], { prefix: process.env.ROUTE_PREFIX ?? "" });

  return server;
};

const _registerRoutes = (server, routes, options) => {
  for (const route of routes) {
    server.register(route, options);
  }
}