-- ============================================================================
-- Smart Parking Management System - MySQL schema
--
-- Run with:   mysql -u root -p < database/schema.sql
-- or:         cd backend && npm run db:init
--
-- To start from scratch:  DROP DATABASE smart_parking_db;  then run this file again.
-- Requires MySQL 8.0.16+ (or MariaDB 10.2+) for CHECK constraints to be enforced.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS smart_parking_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_parking_db;

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id       INT           NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  phone         VARCHAR(30)   NULL,
  role          ENUM('CUSTOMER', 'ADMIN')   NOT NULL DEFAULT 'CUSTOMER',
  status        ENUM('ACTIVE', 'INACTIVE')  NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- vehicles  (one user owns many vehicles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id          INT          NOT NULL AUTO_INCREMENT,
  user_id             INT          NOT NULL,
  registration_number VARCHAR(30)  NOT NULL,
  vehicle_type        VARCHAR(30)  NOT NULL,
  make_model          VARCHAR(100) NULL,
  color               VARCHAR(50)  NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vehicle_id),
  UNIQUE KEY uq_vehicles_registration (registration_number),
  INDEX idx_vehicles_user (user_id),
  CONSTRAINT fk_vehicles_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- parking_locations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_locations (
  location_id     INT          NOT NULL AUTO_INCREMENT,
  name            VARCHAR(150) NOT NULL,
  address         VARCHAR(255) NOT NULL,
  description     TEXT         NULL,
  operating_hours VARCHAR(100) NULL,
  contact_number  VARCHAR(30)  NULL,
  status          ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (location_id)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- parking_slots  (a location has many slots; slot numbers are unique per location)
-- Slot status is the physical/administrative state. Whether a slot is *reserved*
-- for a given period is derived from the reservations table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_slots (
  slot_id     INT          NOT NULL AUTO_INCREMENT,
  location_id INT          NOT NULL,
  slot_number VARCHAR(20)  NOT NULL,
  slot_type   VARCHAR(30)  NOT NULL,
  status      ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slot_id),
  UNIQUE KEY uq_slots_location_number (location_id, slot_number),
  INDEX idx_slots_location (location_id),
  CONSTRAINT fk_slots_location
    FOREIGN KEY (location_id) REFERENCES parking_locations (location_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- parking_fees  (rates per location and vehicle type, valid for a period)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_fees (
  fee_id         INT           NOT NULL AUTO_INCREMENT,
  location_id    INT           NOT NULL,
  vehicle_type   VARCHAR(30)   NOT NULL,
  hourly_rate    DECIMAL(10,2) NOT NULL,
  daily_rate     DECIMAL(10,2) NULL,
  effective_from DATETIME      NOT NULL,
  effective_to   DATETIME      NULL,
  status         ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (fee_id),
  INDEX idx_fees_lookup (location_id, vehicle_type, status),
  CONSTRAINT fk_fees_location
    FOREIGN KEY (location_id) REFERENCES parking_locations (location_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_fee_rates  CHECK (hourly_rate >= 0 AND (daily_rate IS NULL OR daily_rate >= 0)),
  CONSTRAINT chk_fee_period CHECK (effective_to IS NULL OR effective_to > effective_from)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- reservations
-- Two reservations for the same slot overlap when:
--     new_start < existing_end  AND  new_end > existing_start
-- The backend checks this inside a transaction (see reservationService.js).
-- Reservations are never deleted through the API, so booking history is kept:
-- the RESTRICT rules stop users, vehicles and slots that have bookings being deleted.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  reservation_id INT           NOT NULL AUTO_INCREMENT,
  user_id        INT           NOT NULL,
  vehicle_id     INT           NOT NULL,
  slot_id        INT           NOT NULL,
  start_time     DATETIME      NOT NULL,
  end_time       DATETIME      NOT NULL,
  fee_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status         ENUM('RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'RESERVED',
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reservation_id),
  INDEX idx_reservations_slot_time (slot_id, start_time, end_time),
  INDEX idx_reservations_user (user_id),
  INDEX idx_reservations_vehicle_time (vehicle_id, start_time, end_time),
  INDEX idx_reservations_status_end (status, end_time),
  CONSTRAINT fk_reservations_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (vehicle_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_slot
    FOREIGN KEY (slot_id) REFERENCES parking_slots (slot_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_reservation_period CHECK (end_time > start_time),
  CONSTRAINT chk_reservation_fee    CHECK (fee_amount >= 0)
) ENGINE = InnoDB;
