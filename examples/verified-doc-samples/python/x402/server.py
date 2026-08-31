import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from x402 import AssetAmount, x402ResourceServer
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI, set_settlement_overrides
from x402.http.types import RouteConfig
from x402.mechanisms.evm.batch_settlement import SCHEME_BATCH_SETTLEMENT
from x402.mechanisms.evm.batch_settlement.authorizer_signer import LocalAuthorizerSigner
from x402.mechanisms.evm.batch_settlement.server import (
    AutoSettlementConfig,
    BatchSettlementEvmScheme,
    BatchSettlementEvmSchemeServerConfig,
    FileChannelStorage,
)
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.mechanisms.evm.upto import UptoEvmServerScheme

network = "eip155:84532"
pay_to = os.environ.get("PAY_TO", "0x0000000000000000000000000000000000000001")
facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(url=os.environ.get("FACILITATOR_URL", "https://x402.org/facilitator"))
)
batch = BatchSettlementEvmScheme(
    pay_to,
    BatchSettlementEvmSchemeServerConfig(
        withdraw_delay=86_400,
        receiver_authorizer_signer=LocalAuthorizerSigner(os.environ["RECEIVER_AUTHORIZER_PRIVATE_KEY"]),
        storage=FileChannelStorage("./channels"),
    ),
)
server = x402ResourceServer(facilitator)
server.register(network, ExactEvmServerScheme())
server.register(network, UptoEvmServerScheme())
server.register(network, batch)
manager = batch.create_channel_manager(facilitator, network)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    manager.start(AutoSettlementConfig(
        claim_interval_secs=60,
        settle_interval_secs=300,
        refund_interval_secs=3600,
        max_claims_per_batch=100,
    ))
    yield
    await manager.stop(flush=True)


app = FastAPI(lifespan=lifespan)

# docs:start x402-exact-python
routes = {
    "GET /fixed": RouteConfig(
        accepts=[PaymentOption(scheme="exact", price="$0.01", network=network, pay_to=pay_to)],
        description="Fixed-price market report",
        mime_type="application/json",
    )
}


@app.get("/fixed")
async def fixed() -> dict[str, str]:
    return {"report": "Base market summary"}
# docs:end x402-exact-python

# docs:start x402-upto-python
routes["GET /metered"] = RouteConfig(
    accepts=[PaymentOption(scheme="upto", price="$0.10", network=network, pay_to=pay_to)],
    description="Usage-priced inference",
    mime_type="application/json",
)


@app.get("/metered")
async def metered(response: Response) -> dict[str, object]:
    set_settlement_overrides(response, {"amount": "$0.04"})
    return {"tokens": 812, "result": "Generated response"}
# docs:end x402-upto-python

# docs:start x402-batch-python
routes["GET /stream"] = RouteConfig(
    accepts=[PaymentOption(scheme=SCHEME_BATCH_SETTLEMENT, price="$0.01", network=network, pay_to=pay_to)],
    description="High-frequency price tick",
    mime_type="application/json",
)


@app.get("/stream")
async def stream(response: Response) -> dict[str, str]:
    set_settlement_overrides(response, {"amount": "50%"})
    return {"asset": "ETH", "price": "3200.00"}
# docs:end x402-batch-python

if custom_asset := os.environ.get("X402_ASSET"):
    extra = {"name": "Merchant USD", "version": "1", "assetTransferMethod": "permit2"}
    routes["GET /fixed"].accepts[0].price = AssetAmount(amount="10000", asset=custom_asset, extra=extra)
    routes["GET /metered"].accepts[0].price = AssetAmount(amount="100000", asset=custom_asset, extra=extra)
    routes["GET /stream"].accepts[0].price = AssetAmount(amount="10000", asset=custom_asset, extra=extra)

app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)
