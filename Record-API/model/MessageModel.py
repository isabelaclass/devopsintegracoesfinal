from config.database import db

class MessageModel(db.Model):
    __tablename__ = 'message'

    message_id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(500), nullable=False)
    user_id_send = db.Column(db.Integer, nullable=False)
    user_id_receive = db.Column(db.Integer, nullable=False)

    def salvar(self):
        db.session.add(self)
        db.session.commit()