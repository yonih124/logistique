import { app } from './app.js'; 
import { env } from './config/env.js'; 
import { prisma } from './config/prisma.js';
import { attachChatWebSocket } from './websocket/chat_socket.js';
const server=app.listen(env.port,()=>console.log(`API: http://localhost:${env.port}/api`));
attachChatWebSocket(server);
async function shutdown(){
    server.close(async()=>{await prisma.$disconnect();process.exit(0);});} 
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
