process.env.NODE_ENV = "test";
process.env.EXPOSE_DEV_OTP = "true";

const request = require("supertest");

const createApp = require("../src/app");
const { closePool } = require("../src/db");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    const app = createApp();
    const uniqueSuffix = Date.now().toString().slice(-8);
    const phone = `900${uniqueSuffix}`;

    const registerOtpRequest = await request(app)
        .post("/api/v1/auth/otp/request")
        .send({
            phone,
            otpPurpose: "REGISTER"
        })
        .expect(202);

    assert(registerOtpRequest.body.devOtp, "Expected register devOtp in smoke test");
    assert(
        registerOtpRequest.body.otpPurpose === "REGISTER",
        "Expected REGISTER OTP purpose"
    );

    const otpVerify = await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({
            phone,
            otp: registerOtpRequest.body.devOtp,
            otpPurpose: "REGISTER",
            name: "Smoke Test Customer",
            email: `smoke-${uniqueSuffix}@example.com`
        })
        .expect(200);

    const token = otpVerify.body.tokens.accessToken;
    assert(token, "Expected access token after OTP verification");

    const loginOtpRequest = await request(app)
        .post("/api/v1/auth/otp/request")
        .send({
            phone,
            otpPurpose: "LOGIN"
        })
        .expect(202);

    assert(loginOtpRequest.body.devOtp, "Expected login devOtp in smoke test");
    assert(
        loginOtpRequest.body.otpPurpose === "LOGIN",
        "Expected LOGIN OTP purpose"
    );

    const loginResponse = await request(app)
        .post("/api/v1/auth/login")
        .send({
            phone,
            otp: loginOtpRequest.body.devOtp
        })
        .expect(200);

    assert(
        loginResponse.body.tokens.accessToken,
        "Expected access token after login OTP verification"
    );

    const me = await request(app)
        .get("/api/v1/customers/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

    assert(me.body.user.phone === phone, "Expected /customers/me phone to match");

    const createdAddress = await request(app)
        .post("/api/v1/customers/me/addresses")
        .set("Authorization", `Bearer ${token}`)
        .send({
            label: "Home",
            addressLine: "Smoke Test Road",
            city: "Guwahati",
            state: "Assam",
            pincode: "781001",
            latitude: 26.1445,
            longitude: 91.7362,
            isDefault: true
        })
        .expect(201);

    const addressId = createdAddress.body.address.id;
    assert(addressId, "Expected created address id");
    assert(createdAddress.body.address.is_default === true, "Expected default address");

    const addresses = await request(app)
        .get("/api/v1/customers/me/addresses")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

    assert(addresses.body.addresses.length >= 1, "Expected at least one address");

    const updatedAddress = await request(app)
        .patch(`/api/v1/customers/me/addresses/${addressId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ label: "Updated Home" })
        .expect(200);

    assert(
        updatedAddress.body.address.label === "Updated Home",
        "Expected updated address label"
    );

    const deletedAddress = await request(app)
        .delete(`/api/v1/customers/me/addresses/${addressId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

    assert(deletedAddress.body.deleted === true, "Expected address deletion");

    console.log("Smoke auth-address flow passed");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closePool();
    });
