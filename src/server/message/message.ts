import _messageService from "../../services/message.service";

export default (server, opts, done) => {
  server.get("/message", async function handler (request, reply) {
    const { from, to } = request.query;

    let from_: number | undefined = undefined;
    let to_: number | undefined = undefined;
    if (from) {
      try {
        from_ = Date.parse(from);
        if (to) {
          to_ = Date.parse(to);
        }
        const result = _messageService.getMessagesByDate(from_, to_);
        return result;
      } catch (e) {
        throw "Invalid date format(s): must be YYYY-MM-DDTHH:MM, e.g. 2023-10-25T20:05"
      }
    }
    return "No options.";
  });
  done();
}