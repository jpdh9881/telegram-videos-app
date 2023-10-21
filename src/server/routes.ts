import Fastify from 'fastify';
import { AppDataSource } from "../data-source";
import { Channel } from "../entity/Channel";

export const initServer = () => {
  const server = Fastify({
    logger: true
  });

  // @ts-ignore Some stupid type error
  server.get('/', async function handler (request, reply) {
    const users = await AppDataSource.manager.find(Channel)
    return users;
  });
  return server;
};