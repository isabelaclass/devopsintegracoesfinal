from flask import Flask, jsonify
from controller.MessageController import message_bp
from config.database import init_app

app = Flask(__name__)
init_app(app)

# Registra o blueprint da controller
app.register_blueprint(message_bp)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
