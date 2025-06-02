const axios = require('axios');
const redisClient = require('../utils/redisClient');
const { sendToQueue } = require('../utils/rabbitmq');

async function handlePostMessage(req, res) {
  const { userIdSend, userIdReceive, message } = req.body;
  const token = req.headers['authorization'];

  const cacheKey = `auth:${userIdSend}:${token}`;

  try {
    // ─── 1. Verifica se já está em cache ───
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const isAuth = JSON.parse(cached);
      if (!isAuth) return res.status(401).json({ msg: 'sem autorização' });

      // enviar para fila e Record-API depois
      return res.status(200).json({ message: 'Mensagem enviada com sucesso (cache)' });
    }

    // ─── 2. Consulta Auth-API se não estiver em cache ───
    const authResponse = await axios.get(`http://localhost:3000/token?user=${userIdSend}`, {
      headers: {
        Authorization: token
      }
    });

    const isAuth = authResponse.data.auth;

    // ─── 3. Salva resultado no cache ───
    await redisClient.setEx(cacheKey, 60, JSON.stringify(isAuth)); // TTL de 60 segundos

    if (!isAuth) return res.status(401).json({ msg: 'sem autorização' });

    const queueName = `${userIdSend}${userIdReceive}`;
    await sendToQueue(queueName, { userIdSend, userIdReceive, message });

    /*
     await axios.post('http://record-api/message', {
      userIdSend,
      userIdReceive,
      message
    });
    */

    return res.status(200).json({ message: 'Mensagem enviada para a fila com sucesso' });

  } catch (error) {
    console.error('[POST /message] Erro:', error.message);
    return res.status(500).json({ msg: 'Erro interno no servidor' });
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
      const authResponse = await axios.get(`http://localhost:3000/token?user=${userIdSend}`, {
        headers: { Authorization: token }
      });
      isAuth = authResponse.data.auth;
      await redisClient.setEx(cacheKey, 60, JSON.stringify(isAuth));
    } else {
      isAuth = JSON.parse(isAuth);
    }

    if (!isAuth) return res.status(401).json({ msg: 'not auth' });

    // ─── 2. Conecta ao RabbitMQ ───
    const connection = await amqp.connect('amqp://localhost');
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
      await axios.post('http://localhost:5002/message', {
        userIdSend: m.userIdSend,
        userIdReceive: m.userIdReceive,
        message: m.message
      });
    }

    await channel.close();
    await connection.close();

    return res.status(200).json({
      msg: 'ok',
      mensagensTransferidas: mensagens.length
    });

  } catch (error) {
    console.error('[POST /message/worker] Erro:', error.message);
    return res.status(500).json({ msg: 'Erro ao processar fila' });
  }
}

async function handleGetMessage(req, res) {
  const userId = req.query.user;
  const token = req.headers['authorization'];

  const cacheKey = `auth:${userId}:${token}`;

  try {
    // ─── 1. Verifica se o usuário está autenticado ───
    let isAuth = await redisClient.get(cacheKey);
    if (isAuth === null) {
      const authResponse = await axios.get(`http://localhost:3000/token?user=${userId}`, {
        headers: { Authorization: token }
      });
      isAuth = authResponse.data.auth;
      await redisClient.setEx(cacheKey, 60, JSON.stringify(isAuth));
    } else {
      isAuth = JSON.parse(isAuth);
    }

    if (!isAuth) return res.status(401).json({ msg: 'not auth' });

     // ─── 2. Busca usuários da Auth-API com cache ───
    let users = await redisClient.get(userListCacheKey);
    if (users === null) {
      const usersResponse = await axios.get(`http://localhost:3000/user`);
      users = usersResponse.data.users;
      await redisClient.setEx(userListCacheKey, 60, JSON.stringify(users));
    } else {
      users = JSON.parse(users);
    }

      // ─── 3. Consulta mensagens com cache por usuário ───
    const mensagens = [];

    for (const outro of users) {
      const outroId = outro.user_id;
      if (parseInt(outroId) === parseInt(userId)) continue;

      const cacheKey = `messages:${outroId}:${userId}`;
      let mensagensUsuario = await redisClient.get(cacheKey);

      if (mensagensUsuario === null) {
        const resp = await axios.get(`http://localhost:5002/message/${userId}`);
        mensagensUsuario = resp.data.filter(
          msg => msg.userId === outroId
        );
        await redisClient.setEx(cacheKey, 60, JSON.stringify(mensagensUsuario));
      } else {
        mensagensUsuario = JSON.parse(mensagensUsuario);
      }

      mensagens.push(...mensagensUsuario);
    }

    return res.status(200).json(mensagens);

  } catch (error) {
    console.error('[GET /message] Erro:', error.message);
    return res.status(500).json({ msg: 'Erro ao buscar mensagens' });
  }
}

module.exports = { handlePostMessage, handlePostWorker, handleGetMessage };
