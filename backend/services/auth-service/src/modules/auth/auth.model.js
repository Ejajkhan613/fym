const { pool: defaultPool } = require("../../db/pool");

const USER_COLUMNS = `
  u.id,
  u.name,
  u.phone,
  u.role,
  u.status,
  u.created_at,
  u.updated_at
`;

const SESSION_RETURNING_COLUMNS = `
  id,
  user_id,
  refresh_token_hash,
  user_agent,
  ip_address,
  expires_at,
  revoked_at,
  last_used_at,
  created_at,
  updated_at
`;

const SESSION_SELECT_COLUMNS = `
  s.id AS session_id,
  s.user_id AS session_user_id,
  s.refresh_token_hash AS session_refresh_token_hash,
  s.user_agent AS session_user_agent,
  s.ip_address AS session_ip_address,
  s.expires_at AS session_expires_at,
  s.revoked_at AS session_revoked_at,
  s.last_used_at AS session_last_used_at,
  s.created_at AS session_created_at,
  s.updated_at AS session_updated_at
`;

const OTP_COLUMNS = `
  id,
  phone,
  purpose,
  otp_hash,
  attempts,
  max_attempts,
  expires_at,
  verified_at,
  consumed_at,
  created_user_id,
  request_ip,
  created_at
`;

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSessionRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.session_id ?? row.id,
    userId: row.session_user_id ?? row.user_id,
    refreshTokenHash: row.session_refresh_token_hash ?? row.refresh_token_hash,
    userAgent: row.session_user_agent ?? row.user_agent,
    ipAddress: row.session_ip_address ?? row.ip_address,
    expiresAt: row.session_expires_at ?? row.expires_at,
    revokedAt: row.session_revoked_at ?? row.revoked_at,
    lastUsedAt: row.session_last_used_at ?? row.last_used_at,
    createdAt: row.session_created_at ?? row.created_at,
    updatedAt: row.session_updated_at ?? row.updated_at,
  };
}

function mapOtpChallengeRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    phone: row.phone,
    purpose: row.purpose,
    otpHash: row.otp_hash,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    expiresAt: row.expires_at,
    verifiedAt: row.verified_at,
    consumedAt: row.consumed_at,
    createdUserId: row.created_user_id,
    requestIp: row.request_ip,
    createdAt: row.created_at,
  };
}

class AuthModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async createUserFromOtp({
    name,
    phone,
    role = "customer",
    status = "active",
  }) {
    const result = await this.pool.query(
      `
        INSERT INTO users (name, phone, role, status)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          name,
          phone,
          role,
          status,
          created_at,
          updated_at
      `,
      [name, phone, role, status],
    );

    return mapUserRow(result.rows[0]);
  }

  async findUserById(userId) {
    const result = await this.pool.query(
      `
        SELECT ${USER_COLUMNS}
        FROM users u
        WHERE u.id = $1
          AND u.status != 'deleted'
        LIMIT 1
      `,
      [userId],
    );

    return mapUserRow(result.rows[0]);
  }

  async findUserByPhone(phone) {
    const result = await this.pool.query(
      `
        SELECT ${USER_COLUMNS}
        FROM users u
        WHERE u.phone = $1
          AND u.status != 'deleted'
        LIMIT 1
      `,
      [phone],
    );

    return mapUserRow(result.rows[0]);
  }

  async createRefreshSession(session) {
    const result = await this.pool.query(
      `
        INSERT INTO auth_refresh_sessions (
          user_id,
          refresh_token_hash,
          user_agent,
          ip_address,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${SESSION_RETURNING_COLUMNS}
      `,
      [
        session.userId,
        session.refreshTokenHash,
        session.userAgent || null,
        session.ipAddress || null,
        session.expiresAt,
      ],
    );

    return mapSessionRow(result.rows[0]);
  }

  async findActiveRefreshSessionByHash(refreshTokenHash) {
    const result = await this.pool.query(
      `
        SELECT
          ${SESSION_SELECT_COLUMNS},
          ${USER_COLUMNS}
        FROM auth_refresh_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.refresh_token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
          AND u.status != 'deleted'
        LIMIT 1
      `,
      [refreshTokenHash],
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      session: mapSessionRow(result.rows[0]),
      user: mapUserRow(result.rows[0]),
    };
  }

  async rotateRefreshSession(sessionId, refreshTokenHash, expiresAt) {
    const result = await this.pool.query(
      `
        UPDATE auth_refresh_sessions
        SET refresh_token_hash = $2,
            expires_at = $3,
            last_used_at = now(),
            updated_at = now()
        WHERE id = $1
          AND revoked_at IS NULL
        RETURNING ${SESSION_RETURNING_COLUMNS}
      `,
      [sessionId, refreshTokenHash, expiresAt],
    );

    return mapSessionRow(result.rows[0]);
  }

  async revokeRefreshSession(refreshTokenHash) {
    const result = await this.pool.query(
      `
        UPDATE auth_refresh_sessions
        SET revoked_at = now(),
            updated_at = now()
        WHERE refresh_token_hash = $1
          AND revoked_at IS NULL
        RETURNING ${SESSION_RETURNING_COLUMNS}
      `,
      [refreshTokenHash],
    );

    return mapSessionRow(result.rows[0]);
  }

  async revokeAllRefreshSessions(userId) {
    const result = await this.pool.query(
      `
        UPDATE auth_refresh_sessions
        SET revoked_at = now(),
            updated_at = now()
        WHERE user_id = $1
          AND revoked_at IS NULL
      `,
      [userId],
    );

    return result.rowCount;
  }

  async createOtpChallenge(challenge) {
    const result = await this.pool.query(
      `
        INSERT INTO auth_otp_challenges (
          phone,
          purpose,
          otp_hash,
          max_attempts,
          expires_at,
          request_ip
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${OTP_COLUMNS}
      `,
      [
        challenge.phone,
        challenge.purpose,
        challenge.otpHash,
        challenge.maxAttempts,
        challenge.expiresAt,
        challenge.requestIp || null,
      ],
    );

    return mapOtpChallengeRow(result.rows[0]);
  }

  async findLatestOtpChallenge(phone, purpose) {
    const result = await this.pool.query(
      `
        SELECT ${OTP_COLUMNS}
        FROM auth_otp_challenges
        WHERE phone = $1
          AND purpose = $2
          AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [phone, purpose],
    );

    return mapOtpChallengeRow(result.rows[0]);
  }

  async recordOtpAttempt(challengeId) {
    const result = await this.pool.query(
      `
        UPDATE auth_otp_challenges
        SET attempts = attempts + 1
        WHERE id = $1
        RETURNING ${OTP_COLUMNS}
      `,
      [challengeId],
    );

    return mapOtpChallengeRow(result.rows[0]);
  }

  async consumeOtpChallenge(challengeId, userId) {
    const result = await this.pool.query(
      `
        UPDATE auth_otp_challenges
        SET verified_at = now(),
            consumed_at = now(),
            created_user_id = $2
        WHERE id = $1
          AND consumed_at IS NULL
        RETURNING ${OTP_COLUMNS}
      `,
      [challengeId, userId],
    );

    return mapOtpChallengeRow(result.rows[0]);
  }
}

module.exports = {
  AuthModel,
  mapUserRow,
  mapSessionRow,
  mapOtpChallengeRow,
};
