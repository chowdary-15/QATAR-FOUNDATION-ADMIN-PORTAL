from flask import Flask, send_from_directory
from config import Config
from models import db, login_manager
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    CORS(app, supports_credentials=True)

    # Configure login manager
    login_manager.login_view = None  # Disable redirect, return 401 for API

    # Register Blueprints
    from routes.auth import auth_bp
    from routes.opportunities import opp_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(opp_bp)

    # Serve the frontend
    @app.route('/')
    def index():
        return send_from_directory('../frontend', 'admin.html')

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
