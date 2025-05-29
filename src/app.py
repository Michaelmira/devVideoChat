"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_cors import CORS
from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api
from api.admin import setup_admin
from flask_jwt_extended import JWTManager
import datetime


# from models import Person

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../public/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# Set the secret key for session management (VERY IMPORTANT for OAuth state)
app.secret_key = os.getenv("FLASK_SESSION_SECRET_KEY")
if not app.secret_key:
    app.secret_key = "fallback-dev-secret-key-please-set-FLASK_SESSION_SECRET_KEY-in-env"
    print("WARNING: FLASK_SESSION_SECRET_KEY not set in .env. Using a default, insecure key. Please set it for proper session management.")

# Session Cookie Settings for cross-site compatibility (e.g., OAuth callbacks)
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True # Requires HTTPS, which codespaces provide
# app.config["SESSION_COOKIE_DOMAIN"] = ".app.github.dev" # Example if needed, start without it
# app.config["SERVER_NAME"] = os.getenv("BACKEND_URL_WITHOUT_HTTPS_SCHEME") # e.g., verbose-meme-xxx-3001.app.github.dev - might be needed if cookie domain issues persist

# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY") 
if not app.config["JWT_SECRET_KEY"]:
    app.config["JWT_SECRET_KEY"] = "fallback-jwt-secret-key-please-set-JWT_SECRET_KEY-in-env"
    print("WARNING: JWT_SECRET_KEY not set in .env. Using a default, insecure key. Please set it for Flask-JWT-Extended.")

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(days=1)
jwt = JWTManager(app)

# CORS Configuration
cors_origins = []
frontend_url = os.getenv('FRONTEND_URL')
backend_url = os.getenv('BACKEND_URL')
if frontend_url:
    cors_origins.append(frontend_url)
if backend_url: # Usually, backend doesn't need to be in its own CORS origins unless it serves a frontend part
    cors_origins.append(backend_url)
if not cors_origins: # Fallback if neither is set
    cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"] # Sensible defaults for local dev
    print(f"WARNING: FRONTEND_URL and BACKEND_URL not set in .env for CORS. Defaulting to: {cors_origins}")

CORS(app, resources={r"/api/*": {
    "origins": cors_origins,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

# add the admin
setup_admin(app)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')

# Handle/serialize errors like a JSON object


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# any other endpoint will try to serve it like a static file
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # avoid cache memory
    return response


# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
