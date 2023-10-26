export default (server, opts, done) => {
    // @ts-ignore Some stupid type error
    server.get('/', async function handler (request, reply) {
      return "Nothing.";
    });
  done();
}