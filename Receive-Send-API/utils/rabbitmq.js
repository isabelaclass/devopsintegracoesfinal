const amqp = require('amqplib');

let channel;

async function connectRabbitMQ() {
  const rabbitmqHost = process.env.RABBITMQ_HOST || 'amqp://rabbitmq:5672';
  const maxRetries = 10;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const connection = await amqp.connect(rabbitmqHost);
      channel = await connection.createChannel();
      console.log('Conectado ao RabbitMQ');
      return;
    } catch (err) {
      attempt++;
      console.warn(`Erro ao conectar no RabbitMQ (tentativa ${attempt}/${maxRetries}): ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // espera 3 segundos
    }
  }

  console.error('Falha ao conectar no RabbitMQ após várias tentativas. Encerrando.');
  process.exit(1);
}

async function sendToQueue(queueName, message) {
  if (!channel) {
    console.warn('Canal RabbitMQ não iniciado');
    return;
  }

  await channel.assertQueue(queueName, { durable: true });
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
}

module.exports = { connectRabbitMQ, sendToQueue };
