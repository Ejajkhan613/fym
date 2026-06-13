const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const { AuthModel } = require("./auth.model");

function normalizePhone(phone) {
  if (phone === undefined || phone === null) {
    return phone;
  }

  return phone.replace(/[\s-]/g, "");
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isUniqueViolation(error) {
  return error && error.code === "23505";
}

function toConflictError(error) {
  const constraint = error.constraint || "";

  if (constraint.includes("phone")) {
    return createError(409, "A user with this phone number already exists");
  }

  return createError(409, "User already exists");
}

class AuthService {
  constructor({
    authModel = new AuthModel(),
    jwtAccessSecret = process.env.JWT_ACCESS_SECRET || "change-me",
    jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshTokenTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
    otpHashRounds = Number(process.env.OTP_HASH_ROUNDS || 10),
    otpMaxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5),
    otpLength = Number(process.env.OTP_LENGTH || 6),
    otpTtlMinutes = Number(process.env.OTP_TTL_MINUTES || 5),
    now = () => new Date(),
  } = {}) {
    this.authModel = authModel;
    this.jwtAccessSecret = jwtAccessSecret;
    this.jwtAccessExpiresIn = jwtAccessExpiresIn;
    this.refreshTokenTtlDays = refreshTokenTtlDays;
    this.otpHashRounds = otpHashRounds;
    this.otpMaxAttempts = otpMaxAttempts;
    this.otpLength = otpLength;
    this.otpTtlMinutes = otpTtlMinutes;
    this.now = now;
  }

  async requestLoginOtp(input, context = {}) {
    return this.requestOtp(
      {
        phone: input.phone,
        purpose: "login",
      },
      context,
    );
  }

  async requestOtp(input, context = {}) {
    const phone = normalizePhone(input.phone);
    const purpose = input.purpose || "login";
    const existingUser = await this.authModel.findUserByPhone(phone);

    if (purpose === "login" && !existingUser) {
      throw createError(404, "User not found");
    }

    if (purpose === "register" && existingUser) {
      throw createError(409, "A user with this phone number already exists");
    }

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, this.otpHashRounds);
    const expiresAt = addMinutes(this.now(), this.otpTtlMinutes);

    const challenge = await this.authModel.createOtpChallenge({
      phone,
      purpose,
      otpHash,
      maxAttempts: this.otpMaxAttempts,
      expiresAt,
      requestIp: context.ipAddress,
    });

    const response = {
      challengeId: challenge.id,
      phone: challenge.phone,
      purpose: challenge.purpose,
      expiresAt: challenge.expiresAt,
      delivery: {
        channel: "sms",
        status: "queued",
      },
    };

    if (process.env.NODE_ENV !== "production") {
      response.devOtp = otp;
    }

    return response;
  }

  async verifyOtp(input, context = {}) {
    const phone = normalizePhone(input.phone);
    const purpose = input.purpose || "login";
    const challenge = await this.authModel.findLatestOtpChallenge(
      phone,
      purpose,
    );

    if (!challenge || challenge.consumedAt) {
      throw createError(400, "OTP challenge not found");
    }

    if (new Date(challenge.expiresAt).getTime() <= this.now().getTime()) {
      throw createError(400, "OTP has expired");
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw createError(429, "Too many OTP attempts");
    }

    const otpMatches = await bcrypt.compare(input.otp, challenge.otpHash);

    if (!otpMatches) {
      await this.authModel.recordOtpAttempt(challenge.id);
      throw createError(401, "Invalid OTP");
    }

    let user = await this.authModel.findUserByPhone(phone);

    if (purpose === "register") {
      if (user) {
        throw createError(409, "A user with this phone number already exists");
      }

      try {
        user = await this.authModel.createUserFromOtp({
          name: input.name,
          phone,
          role: "customer",
          status: "active",
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw toConflictError(error);
        }

        throw error;
      }
    }

    if (purpose === "login" && !user) {
      throw createError(404, "User not found");
    }

    this.assertCanAuthenticate(user);
    await this.authModel.consumeOtpChallenge(challenge.id, user.id);

    return this.issueTokenPair(user, context);
  }

  async refresh(refreshToken) {
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const result =
      await this.authModel.findActiveRefreshSessionByHash(refreshTokenHash);

    if (!result) {
      throw createError(401, "Invalid refresh token");
    }

    this.assertCanAuthenticate(result.user);

    const nextRefreshToken = this.generateOpaqueToken();
    const refreshTokenExpiresAt = addDays(this.now(), this.refreshTokenTtlDays);

    const rotatedSession = await this.authModel.rotateRefreshSession(
      result.session.id,
      hashOpaqueToken(nextRefreshToken),
      refreshTokenExpiresAt,
    );

    if (!rotatedSession) {
      throw createError(401, "Invalid refresh token");
    }

    return {
      user: result.user,
      tokens: {
        accessToken: this.createAccessToken(result.user),
        refreshToken: nextRefreshToken,
        tokenType: "Bearer",
        accessTokenExpiresIn: this.jwtAccessExpiresIn,
        refreshTokenExpiresAt,
      },
    };
  }

  async logout(refreshToken) {
    await this.authModel.revokeRefreshSession(hashOpaqueToken(refreshToken));
    return { revoked: true };
  }

  async logoutAll(accessToken) {
    const claims = this.verifyAccessToken(accessToken);
    const revokedCount = await this.authModel.revokeAllRefreshSessions(
      claims.sub,
    );

    return { revokedCount };
  }

  async getCurrentUser(accessToken) {
    const claims = this.verifyAccessToken(accessToken);
    const user = await this.authModel.findUserById(claims.sub);

    if (!user) {
      throw createError(404, "User not found");
    }

    return user;
  }

  async issueTokenPair(user, context = {}) {
    this.assertCanAuthenticate(user);

    const refreshToken = this.generateOpaqueToken();
    const refreshTokenExpiresAt = addDays(this.now(), this.refreshTokenTtlDays);

    await this.authModel.createRefreshSession({
      userId: user.id,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      user,
      tokens: {
        accessToken: this.createAccessToken(user),
        refreshToken,
        tokenType: "Bearer",
        accessTokenExpiresIn: this.jwtAccessExpiresIn,
        refreshTokenExpiresAt,
      },
    };
  }

  createAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        status: user.status,
      },
      this.jwtAccessSecret,
      {
        expiresIn: this.jwtAccessExpiresIn,
        issuer: "fym.auth-service",
      },
    );
  }

  verifyAccessToken(accessToken) {
    try {
      return jwt.verify(accessToken, this.jwtAccessSecret, {
        issuer: "fym.auth-service",
      });
    } catch (error) {
      throw createError(401, "Invalid access token");
    }
  }

  assertCanAuthenticate(user) {
    if (!user || user.status === "deleted") {
      throw createError(401, "Invalid authentication state");
    }

    if (user.status === "blocked" || user.status === "suspended") {
      throw createError(403, "Account is not allowed to authenticate");
    }
  }

  generateOpaqueToken() {
    return crypto.randomBytes(48).toString("base64url");
  }

  generateOtp() {
    const max = 10 ** this.otpLength;
    return String(crypto.randomInt(0, max)).padStart(this.otpLength, "0");
  }
}

module.exports = {
  AuthService,
  hashOpaqueToken,
  normalizePhone,
};
