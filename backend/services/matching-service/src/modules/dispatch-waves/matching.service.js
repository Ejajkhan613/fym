const createError = require("http-errors");
const { MatchingModel } = require("./matching.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class MatchingService {
  constructor({
    matchingModel = new MatchingModel(),
    defaultCandidateLimit = 5,
    defaultRadiusKm = 5,
    defaultOfferTtlSeconds = Number(process.env.ORDER_OFFER_TTL_SECONDS || 45),
  } = {}) {
    this.matchingModel = matchingModel;
    this.defaultCandidateLimit = defaultCandidateLimit;
    this.defaultRadiusKm = defaultRadiusKm;
    this.defaultOfferTtlSeconds = defaultOfferTtlSeconds;
  }

  async selectCandidates(input = {}) {
    return this.matchingModel.selectCandidates({
      city: input.city ? `%${input.city}%` : undefined,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm ?? this.defaultRadiusKm,
      minimumTrustScore: input.minimumTrustScore ?? 0,
      limit: input.limit ?? this.defaultCandidateLimit,
    });
  }

  async dispatch(input) {
    const candidates = input.candidatePharmacyIds?.length
      ? await this.matchingModel.findCandidatesByIds(input.candidatePharmacyIds)
      : await this.selectCandidates(input);

    if (candidates.length === 0) {
      throw createError(409, "No Pharmacy is taking orders right now");
    }

    try {
      const result = await this.matchingModel.dispatchOrder({
        orderId: input.orderId,
        pharmacyIds: candidates.map((candidate) => candidate.id),
        waveNumber: input.waveNumber ?? 1,
        offerTtlSeconds: input.offerTtlSeconds ?? this.defaultOfferTtlSeconds,
      });

      if (result.outcome === "ORDER_NOT_FOUND") {
        throw createError(404, "Order not found");
      }

      if (result.outcome === "ORDER_NOT_DISPATCHABLE") {
        throw createError(
          409,
          `Order status ${result.orderStatus} cannot be dispatched`,
        );
      }

      return {
        ...result,
        candidates,
      };
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async listOffers(filters = {}) {
    return this.matchingModel.listOffers({
      orderId: filters.orderId,
      pharmacyId: filters.pharmacyId,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced order or pharmacy does not exist");
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Matching data violates database constraints");
    }
  }
}

module.exports = {
  MatchingService,
};
