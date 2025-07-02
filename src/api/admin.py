import os
from flask_admin import Admin
from .models import db, User, UserImage, VideoSession
from flask_admin.contrib.sqla import ModelView

def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='Video Chat Admin', template_mode='bootstrap3')

    # Add new simplified models for video chat app
    admin.add_view(ModelView(User, db.session))
    admin.add_view(ModelView(UserImage, db.session))
    admin.add_view(ModelView(VideoSession, db.session))

    # You can duplicate that line to add new models
    # admin.add_view(ModelView(YourModelName, db.session))