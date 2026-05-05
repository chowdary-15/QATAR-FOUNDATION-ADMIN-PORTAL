import logging
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Opportunity

opp_bp = Blueprint('opp', __name__)
logger = logging.getLogger(__name__)

VALID_CATEGORIES = {'technology', 'business', 'design', 'marketing', 'data', 'other'}


def opp_to_dict(opp, full=False):
    """Serialize an Opportunity to a dict."""
    data = {
        'id': opp.id,
        'name': opp.name,
        'category': opp.category,
        'duration': opp.duration,
        'start_date': opp.start_date,
        'description': opp.description,
    }
    if full:
        data.update({
            'skills': opp.skills,
            'future_opps': opp.future_opps,
            'max_applicants': opp.max_applicants,
        })
    return data


# ─────────────────────────────────────────────
# US-2.1  View All Opportunities
# ─────────────────────────────────────────────
@opp_bp.route('/api/opportunities', methods=['GET'])
@login_required
def get_opportunities():
    """Return all opportunities belonging to the logged-in admin."""
    opps = (
        Opportunity.query
        .filter_by(admin_id=current_user.id)
        .order_by(Opportunity.created_at.desc())
        .all()
    )
    return jsonify([opp_to_dict(o, full=True) for o in opps]), 200


# ─────────────────────────────────────────────
# US-2.2  Add a New Opportunity
# ─────────────────────────────────────────────
@opp_bp.route('/api/opportunities', methods=['POST'])
@login_required
def add_opportunity():
    """Create a new opportunity linked to the current admin."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    # Required fields
    required = ['name', 'duration', 'start_date', 'description', 'skills', 'category', 'future_opps']
    missing = [f for f in required if not (data.get(f) or '').strip()]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    # Validate category
    category = data['category'].strip().lower()
    if category not in VALID_CATEGORIES:
        return jsonify({'error': f'Invalid category. Must be one of: {", ".join(VALID_CATEGORIES)}'}), 400

    # Optional max_applicants
    max_applicants = None
    raw_max = data.get('max_applicants')
    if raw_max not in (None, '', 0):
        try:
            max_applicants = int(raw_max)
            if max_applicants <= 0:
                return jsonify({'error': 'Maximum applicants must be a positive number'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Maximum applicants must be a valid number'}), 400

    new_opp = Opportunity(
        name=data['name'].strip(),
        duration=data['duration'].strip(),
        start_date=data['start_date'].strip(),
        description=data['description'].strip(),
        skills=data['skills'].strip(),
        category=category,
        future_opps=data['future_opps'].strip(),
        max_applicants=max_applicants,
        admin_id=current_user.id
    )
    db.session.add(new_opp)
    db.session.commit()

    logger.info('Opportunity created id=%s by admin id=%s', new_opp.id, current_user.id)
    return jsonify({'message': 'Opportunity created successfully', 'opportunity': opp_to_dict(new_opp, full=True)}), 201


# ─────────────────────────────────────────────
# US-2.4  View Opportunity Details
# ─────────────────────────────────────────────
@opp_bp.route('/api/opportunities/<int:opp_id>', methods=['GET'])
@login_required
def get_opportunity(opp_id):
    """Return full details of a single opportunity owned by the current admin."""
    opp = Opportunity.query.filter_by(id=opp_id, admin_id=current_user.id).first()
    if not opp:
        return jsonify({'error': 'Opportunity not found'}), 404
    return jsonify(opp_to_dict(opp, full=True)), 200


# ─────────────────────────────────────────────
# US-2.5  Edit an Opportunity
# ─────────────────────────────────────────────
@opp_bp.route('/api/opportunities/<int:opp_id>', methods=['PUT'])
@login_required
def update_opportunity(opp_id):
    """Update an existing opportunity. Only the owning admin can edit."""
    opp = Opportunity.query.filter_by(id=opp_id, admin_id=current_user.id).first()
    if not opp:
        return jsonify({'error': 'Opportunity not found'}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    # Required fields validation (same as create)
    required = ['name', 'duration', 'start_date', 'description', 'skills', 'category', 'future_opps']
    missing = [f for f in required if not (data.get(f) or '').strip()]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    category = data['category'].strip().lower()
    if category not in VALID_CATEGORIES:
        return jsonify({'error': f'Invalid category. Must be one of: {", ".join(VALID_CATEGORIES)}'}), 400

    # Optional max_applicants
    max_applicants = None
    raw_max = data.get('max_applicants')
    if raw_max not in (None, '', 0):
        try:
            max_applicants = int(raw_max)
            if max_applicants <= 0:
                return jsonify({'error': 'Maximum applicants must be a positive number'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Maximum applicants must be a valid number'}), 400

    opp.name = data['name'].strip()
    opp.duration = data['duration'].strip()
    opp.start_date = data['start_date'].strip()
    opp.description = data['description'].strip()
    opp.skills = data['skills'].strip()
    opp.category = category
    opp.future_opps = data['future_opps'].strip()
    opp.max_applicants = max_applicants

    db.session.commit()

    logger.info('Opportunity updated id=%s by admin id=%s', opp_id, current_user.id)
    return jsonify({'message': 'Opportunity updated successfully', 'opportunity': opp_to_dict(opp, full=True)}), 200


# ─────────────────────────────────────────────
# US-2.6  Delete an Opportunity
# ─────────────────────────────────────────────
@opp_bp.route('/api/opportunities/<int:opp_id>', methods=['DELETE'])
@login_required
def delete_opportunity(opp_id):
    """Permanently delete an opportunity. Only the owning admin can delete."""
    opp = Opportunity.query.filter_by(id=opp_id, admin_id=current_user.id).first()
    if not opp:
        return jsonify({'error': 'Opportunity not found'}), 404

    db.session.delete(opp)
    db.session.commit()

    logger.info('Opportunity deleted id=%s by admin id=%s', opp_id, current_user.id)
    return jsonify({'message': 'Opportunity deleted successfully'}), 200
