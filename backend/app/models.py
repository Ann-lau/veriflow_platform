import uuid
from datetime import datetime, timezone
from sqlalchemy import (Column, String, DateTime, Numeric, Boolean,
                        Integer, ForeignKey, Text)
from sqlalchemy.orm import relationship
from .database import Base

def gen_uuid():
    return str(uuid.uuid4())

def utcnow():
    """Current UTC time as a naive datetime (database-safe)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class WaterPoint(Base):
    __tablename__ = "water_points"
    id = Column(String, primary_key=True, default=gen_uuid)
    type = Column(String, nullable=False)          # handpump | tapstand | solar_pumped
    gps_lat = Column(Numeric(9, 6), nullable=False)
    gps_lon = Column(Numeric(9, 6), nullable=False)
    status = Column(String, default="unknown")     # functional | broken | unknown
    registered_date = Column(DateTime, default=utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(String, nullable=False)          # technician | wuc_rep | admin | funder

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(String, primary_key=True)          # client-generated UUID (offline-first)
    waterpoint_id = Column(String, ForeignKey("water_points.id"), nullable=False)
    technician_id = Column(String, ForeignKey("users.id"))
    state = Column(String, default="logged")       # logged | dispatched | parts_replaced | flow_verified
    description = Column(Text)
    created_at = Column(DateTime, default=utcnow)
    water_point = relationship("WaterPoint")
    technician = relationship("User")
    transitions = relationship("StateTransition")
    evidence_bundles = relationship("EvidenceBundle")

class StateTransition(Base):
    __tablename__ = "state_transitions"
    id = Column(String, primary_key=True, default=gen_uuid)
    workorder_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    from_state = Column(String)
    to_state = Column(String, nullable=False)
    timestamp = Column(DateTime, default=utcnow)
    actor_id = Column(String, ForeignKey("users.id"))

class EvidenceBundle(Base):
    __tablename__ = "evidence_bundles"
    id = Column(String, primary_key=True, default=gen_uuid)
    workorder_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    photo_ref = Column(String)                     # storage path / URL
    gps_captured_lat = Column(Numeric(9, 6))
    gps_captured_lon = Column(Numeric(9, 6))
    captured_at = Column(DateTime)
    validation_result = Column(String)             # accepted | flagged | rejected | pending
    validation_reason = Column(Text)
    work_order = relationship("WorkOrder")

class FundingPeriod(Base):
    __tablename__ = "funding_periods"
    id = Column(String, primary_key=True, default=gen_uuid)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

class ComplianceReport(Base):
    __tablename__ = "compliance_reports"
    id = Column(String, primary_key=True, default=gen_uuid)
    period_id = Column(String, ForeignKey("funding_periods.id"), nullable=False)
    verified_repair_count = Column(Integer, default=0)
    uptime_estimate = Column(Numeric(5, 2))
    generated_at = Column(DateTime, default=utcnow)
    entries = relationship("ReportEntry")

class ReportEntry(Base):
    __tablename__ = "report_entries"
    id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("compliance_reports.id"), nullable=False)
    workorder_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    verified_flag = Column(Boolean, default=True)

class AppliedOperation(Base):
    """Idempotency ledger: every synced operation is recorded by its
    client-generated op_id, so replays are detected and skipped (NFR2)."""
    __tablename__ = "applied_operations"
    op_id = Column(String, primary_key=True)
    entity = Column(String, nullable=False)
    applied_at = Column(DateTime, default=utcnow)
    result = Column(String)                        # applied | duplicate
    