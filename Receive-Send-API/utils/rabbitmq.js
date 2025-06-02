const amqp = require('amqplib');

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    console.log('Conectado ao RabbitMQ');
  } catch (err) {
    console.error('Erro ao conectar no RabbitMQ:', err);
  }
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
