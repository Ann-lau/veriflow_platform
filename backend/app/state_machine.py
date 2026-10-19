"""Single source of truth for the work-order lifecycle (FR4, NFR4).

Both the REST router and the sync endpoint import from here, so the two
entry points can never disagree about which transitions are legal.
"""

VALID_TRANSITIONS = {
    "logged": {"dispatched"},
    "dispatched": {"parts_replaced"},
    "parts_replaced": {"flow_verified"},
    "flow_verified": set(),
}


def allowed_next(state: str) -> set[str]:
    """States a work order in `state` may move to next."""
    return VALID_TRANSITIONS.get(state, set())


def can_transition(current: str, new: str) -> bool:
    return new in allowed_next(current)