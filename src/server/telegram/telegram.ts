import _telegramService from "../../services/telegram.service";

export default (server, opts, done) => {
  server.get("/telegram/disconnect", async function handler (request, reply) {
    const client = _telegramService.getClient();
    if (!client.connected) {
      return "already disconnected";
    }
    await client.disconnect();
    await client.destroy(); // uhhhh, just in case
    client.session.close(); // uhhhh, just in case
    return "disconnected? " + client.disconnected;
  });
  server.get("/telegram/connect", async function handler (request, reply) {
    const client = _telegramService.getClient();
    if (client.connected) {
      return "already connected";
    }
    await client.connect();
    return "connected? " + client.connected;
  });
  server.get("/telegram/status", async function handler (request, reply) {
    const client = _telegramService.getClient();
    return "connected? " + client.connected;
  });
  done();
}