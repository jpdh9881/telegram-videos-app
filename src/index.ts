import { AppDataSource } from "./data-source";
import { Channel } from "./entity/Channel";
import { Message } from "./entity/Message";
import { initServer } from "./server/routes";

AppDataSource.initialize().then(async () => {

    // console.log("Inserting a new user into the database...");
    // const channel = new Channel();
    // channel.tg_id = 123;
    // channel.name = Date.now().toString();
    // await AppDataSource.manager.save(channel);
    // console.log("Saved a new user with id: " + channel.id);

    // console.log("Loading users from the database...");
    // const users = await AppDataSource.manager.find(Channel);
    // console.log("Loaded users: ", users);

    // Set up and run the server
    const server = await initServer();
    try {
        await server.listen({ port: 3000 });
      } catch (err) {
        server.log.error(err);
        process.exit(1);
      }
}).catch(error => console.log(error));
