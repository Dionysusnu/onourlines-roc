import betterLogging from 'better-logging';
betterLogging(console,{
  format: ctx => `${ctx.date}${ctx.time24}${ctx.type}${ctx.STAMP('index.js', chalk.blueBright)} ${ctx.msg}`
});

import { readFileSync } from "fs";
import { createServer as createSecureServer} from "https";
import { createServer } from "http";
import { Server } from "socket.io";
import chalk from 'chalk';
import ROCManager from "./ROCManager.js";
import DiscordBot from "./bot.js";
import config from "./config.json" with { type: "json" };

import { rocSockets } from './sockets.js';
import { adminSockets } from './adminSockets.js';
// End Better Logger

let httpServer;

if(typeof config.server.ssl !== 'undefined') {
  console.log(chalk.greenBright("HTTPS MODE ENABLED: Using certificate..."));
  httpServer = createSecureServer({
    key: readFileSync(config.server.ssl.key),
    cert: readFileSync(config.server.ssl.cert)
  });
} else {
  console.log(chalk.greenBright("STARTING HTTP SERVER"));
  httpServer = createServer();
}

const port = config.server.port;


const io = new Server(httpServer,{
  'pingTimeout': 7000,
  'pingInterval': 3000,
  cors: {
    origin: config.corsOrigin
  },
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  }
});

httpServer.listen(port);
console.log(chalk.greenBright("Server started and listening on port", port));

const discordBot = new DiscordBot(config.token, config.prefix, config.guild);
const rocManager = new ROCManager(io, discordBot, config);

discordBot.setGameManager(rocManager);
await discordBot.setUpBot().then(() => {
  console.log("Configuring voice channels");
  discordBot.configureVoiceChannels()
});

io.on('connection', (socket) => {
  console.info(chalk.blueBright("SocketIO Connection"), chalk.yellow("Users connected:"), chalk.white(io.sockets.sockets.size));
  rocSockets(socket, rocManager);
  adminSockets(socket, rocManager, config);
});
