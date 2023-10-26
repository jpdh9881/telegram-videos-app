import { AppDataSource } from "../../data-source";
import { Channel1 } from "../../entity/Channel1";

export default (server, opts, done) => {
  server.get('/channel', async function handler (request, reply) {
    const channels = await AppDataSource.manager.find(Channel1)
    return channels;
  });
  done();
}