import re
import logging
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from models import db, Admin

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)


def is_valid_email(email):
    """Validate email format."""
    pattern = r'^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
    return re.match(pattern, email) is not None


# ─────────────────────────────────────────────
# US-1.1  Admin Sign Up
# ─────────────────────────────────────────────
@auth_bp.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    # Validate required fields
    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if not password:
        return jsonify({'error': 'Password is required'}), 400

    # Validate email format
    if not is_valid_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    # Validate password length
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    # Check if email already registered
    if Admin.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 409

    # Create new admin
    new_admin = Admin(full_name=full_name, email=email)
    new_admin.set_password(password)
    db.session.add(new_admin)
    db.session.commit()

    logger.info('New admin registered: %s', email)
    return jsonify({'message': 'Account created successfully'}), 201


# ─────────────────────────────────────────────
# US-1.2  Admin Login
# ─────────────────────────────────────────────
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    remember = bool(data.get('remember', False))

    if not email or not password:
        return jsonify({'error': 'Invalid email or password'}), 401

    admin = Admin.query.filter_by(email=email).first()

    # Generic error — do not reveal which field is wrong
    if not admin or not admin.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # Set session permanence based on Remember Me
    session.permanent = remember
    login_user(admin, remember=remember)

    logger.info('Admin logged in: %s (remember=%s)', email, remember)
    return jsonify({
        'message': 'Login successful',
        'admin': {
            'id': admin.id,
            'full_name': admin.full_name,
            'email': admin.email
        }
    }), 200


# ─────────────────────────────────────────────
# US-1.3  Forgot Password
# ─────────────────────────────────────────────
@auth_bp.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    email = (data.get('email') or '').strip().lower()

    if not email or not is_valid_email(email):
        return jsonify({'error': 'Please enter a valid email address'}), 400

    # Always return the same success message regardless of whether email exists
    # (privacy protection — do not reveal if email is registered)
    admin = Admin.query.filter_by(email=email).first()
    if admin:
        token = admin.generate_reset_token()
        reset_link = f'http://localhost:5000/api/reset-password?token={token}'
        # Log internally — no actual email sending
        logger.info('Password reset link for %s: %s', email, reset_link)

    return jsonify({
        'message': 'If this email is registered, a reset link has been sent.'
    }), 200


# ─────────────────────────────────────────────
# Reset Password (token-based)
# ─────────────────────────────────────────────
@auth_bp.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    token = (data.get('token') or '').strip()
    new_password = data.get('password') or ''

    if not token:
        return jsonify({'error': 'Reset token is required'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    admin = Admin.query.filter_by(reset_token=token).first()
    if not admin or not admin.verify_reset_token(token):
        return jsonify({'error': 'This reset link is invalid or has expired'}), 400

    admin.set_password(new_password)
    admin.clear_reset_token()

    logger.info('Password reset successfully for admin id=%s', admin.id)
    return jsonify({'message': 'Password reset successfully'}), 200


# ─────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────
@auth_bp.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logger.info('Admin logged out: %s', current_user.email)
    logout_user()
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200


# ─────────────────────────────────────────────
# Get current session info (used on page reload)
# ─────────────────────────────────────────────
@auth_bp.route('/api/me', methods=['GET'])
def me():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'admin': {
                'id': current_user.id,
                'full_name': current_user.full_name,
                'email': current_user.email
            }
        }), 200
    return jsonify({'authenticated': False}), 200
