require('dotenv').config();
const axios = require('axios');
const redisClient = require('../utils/redisClient');
const { sendToQueue } = require('../utils/rabbitmq');
const amqp = require('amqplib');

const AUTH_API_HOST = process.env.AUTH_API_HOST || 'http://localhost:3000';
const RECORD_API_HOST = process.env.RECORD_API_HOST || 'http://localhost:5002';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'amqp://localhost';

async function handlePostMessage(req, res) {
  const { userIdSend, userIdReceive, message } = req.body;
  const token = req.headers['authorization'];
  const cacheKey = `auth:${userIdSend}:${token}`;

  try {
    let isAuth;

    // ─── 1. Verifica cache ───
    const cached = await redisClient.get(cacheKey);
    if (cached !== null) {
      try {
        isAuth = JSON.parse(cached);
      } catch {
        isAuth = false;
      }
    }

    // ─── 2. Consulta Auth-API se necessário ───
    if (isAuth === undefined) {
      const authResponse = await axios.get(`${AUTH_API_HOST}/token?user=${userIdSend}`, {
        headers: {
          Authorization: token
        }
      });
      isAuth = authResponse.data.auth;
      await redisClient.setEx(cacheKey, 60, JSON.stringify(isAuth));
    }

    if (!isAuth) return res.status(401).json({ msg: 'sem autorização' });

    // ─── 3. Envia para a fila ───
    const queueName = `${userIdSend}${userIdReceive}`;
    await sendToQueue(queueName, { userIdSend, userIdReceive, message });

    console.log(`[POST /message] Mensagem enviada para a fila ${queueName}`);

    return res.status(200).json({ message: 'Mensagem enviada com sucesso' });

  } catch (error) {
    console.error('[POST /message] Erro ao enviar mensagem:', error.message);
    return res.status(500).json({ msg: 'Erro ao enviar mensagem' });
  }
}

async function handlePostWorker(req, res) {
  const { userIdSend, userIdReceive } = req.body;
  const token = req.headers['authorization'];
  const cacheKey = `auth:${userIdSend}:${token}`;

  try {
    // ─── 1. Valida o token ───
    let isAuth = await redisClient.get(cacheKey);
    if (isAuth === null) {
      const authResponse = await axios.get(`${AUTH_API_HOST}/token?user=${userIdSend}`, {
        headers: { Authorization: token }
      });
      isAuth = authResponse.data.auth;
      await redisClient.setEx(cacheKey, 60, JSON.stringify(isAuth));
    } else {
      isAuth = JSON.parse(isAuth);
    }

    if (!isAuth) return res.status(401).json({ msg: 'not auth' });

    // ─── 2. Conecta ao RabbitMQ ───
    const connection = await amqp.connect(RABBITMQ_HOST);
    const channel = await connection.createChannel();
    const queueName = `${userIdSend}${userIdReceive}`;
    await channel.assertQueue(queueName, { durable: true });

    const mensagens = [];

    // ─── 3. Lê todas as mensagens da fila ───
    let msg;
    do {
      msg = await channel.get(queueName, { noAck: true });
      if (msg) {
        const conteudo = JSON.parse(msg.content.toString());
        mensagens.push(conteudo);
      }
    } while (msg);

    // ─── 4. Envia para a Record-API ───
    for (const m of mensagens) {
      await axios.post(`${RECORD_API_HOST}/message`, {
        userIdSend: m.userIdSend,
        userIdReceive: m.userIdReceive,
        message: m.message
      });
    }

    await channel.close();
    await connection.close();

    return res.status(200).json({
      msg: 'ok'
    });

  } catch (error) {
    console.error('[POST /message/worker] Erro:', error.message);
    return res.status(500).json({ msg: 'Erro ao processar fila' });
  }
}

async function handleGetMessage(req, res) {
  const userId = req.query.user;
  const token = req.headers['authorization'];
  const authCacheKey = `auth:${userId}:${token}`;
  const userListCacheKey = `user-list`;

  console.log('[GET /message] Iniciando requisição para usuário:', userId);

  try {
    // ─── 1. Verifica se o usuário está autenticado ───
    let isAuth = await redisClient.get(authCacheKey);
    if (isAuth === null) {
      console.log('[GET /message] Token não encontrado no cache. Consultando Auth-API...');
      const authResponse = await axios.get(`${AUTH_API_HOST}/token?user=${userId}`, {
        headers: { Authorization: token }
      });
      isAuth = authResponse.data.auth;
      await redisClient.setEx(authCacheKey, 60, JSON.stringify(isAuth));
      console.log('[GET /message] Resposta da Auth-API armazenada em cache.');
    } else {
      try {
        isAuth = JSON.parse(isAuth);
        console.log('[GET /message] Token encontrado no cache.');
      } catch {
        isAuth = false;
        console.warn('[GET /message] Erro ao fazer parse do cache de autenticação.');
      }
    }

    if (!isAuth) {
      console.warn('[GET /message] Usuário não autorizado.');
      return res.status(401).json({ msg: 'not auth' });
    }

    // ─── 2. Busca usuários da Auth-API com cache ───
    let users = await redisClient.get(userListCacheKey);
    if (users === null) {
      console.log('[GET /message] Lista de usuários não encontrada no cache. Consultando Auth-API...');
      const usersResponse = await axios.get(`${AUTH_API_HOST}/user`);
      users = usersResponse.data.users;
      await redisClient.setEx(userListCacheKey, 60, JSON.stringify(users));
      console.log('[GET /message] Lista de usuários armazenada no cache.');
    } else {
      try {
        users = JSON.parse(users);
        console.log('[GET /message] Lista de usuários carregada do cache.');
      } catch {
        users = [];
        console.warn('[GET /message] Erro ao fazer parse da lista de usuários no cache.');
      }
    }

    // ─── 3. Consulta mensagens com cache por usuário ───
    const mensagens = [];

    for (const outro of users) {
      const outroId = outro.user_id;
      if (parseInt(outroId) === parseInt(userId)) continue;

      const messageCacheKey = `messages:${outroId}:${userId}`;
      let mensagensUsuario = await redisClient.get(messageCacheKey);

      if (mensagensUsuario === null) {
        console.log(`[GET /message] Mensagens entre ${outroId} e ${userId} não encontradas no cache. Consultando Record-API...`);
       const resp = await axios.get(`${RECORD_API_HOST}/message?user=${userId}`, {
          headers: { Authorization: token }
        });
        mensagensUsuario = resp.data.filter(msg => msg.userId === outroId);
        await redisClient.setEx(messageCacheKey, 60, JSON.stringify(mensagensUsuario));
        console.log(`[GET /message] Mensagens entre ${outroId} e ${userId} armazenadas no cache.`);
      } else {
        try {
          mensagensUsuario = JSON.parse(mensagensUsuario);
          console.log(`[GET /message] Mensagens entre ${outroId} e ${userId} carregadas do cache.`);
        } catch {
          mensagensUsuario = [];
          console.warn(`[GET /message] Erro ao fazer parse das mensagens entre ${outroId} e ${userId} no cache.`);
        }
      }

      mensagens.push(...mensagensUsuario);
    }

    console.log(`[GET /message] Retornando ${mensagens.length} mensagens para o usuário ${userId}.`);
    return res.status(200).json(mensagens);

  } catch (error) {
    console.error('[GET /message] Erro ao buscar mensagens:', error.message);
    return res.status(500).json({ msg: 'Erro ao buscar mensagens' });
  }
}

module.exports = { handlePostMessage, handlePostWorker, handleGetMessage };
