package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	x402 "github.com/x402-foundation/x402/go/v2"
	x402http "github.com/x402-foundation/x402/go/v2/http"
	nethttpmw "github.com/x402-foundation/x402/go/v2/http/nethttp"
	"github.com/x402-foundation/x402/go/v2/mechanisms/evm/batch-settlement"
	batchedserver "github.com/x402-foundation/x402/go/v2/mechanisms/evm/batch-settlement/server"
	exactevm "github.com/x402-foundation/x402/go/v2/mechanisms/evm/exact/server"
	evmsigners "github.com/x402-foundation/x402/go/v2/signers/evm"
	uptoevm "github.com/x402-foundation/x402/go/v2/mechanisms/evm/upto/server"
)

const network = x402.Network("eip155:84532")

func required(name string) string {
	value := os.Getenv(name)
	if value == "" {
		panic("missing " + name)
	}
	return value
}

func main() {
	payTo := required("PAY_TO")
	facilitator := x402http.NewHTTPFacilitatorClient(&x402http.FacilitatorConfig{
		URL: "https://x402.org/facilitator",
	})
	authorizer, err := evmsigners.NewClientSignerFromPrivateKey(required("RECEIVER_AUTHORIZER_PRIVATE_KEY"))
	if err != nil {
		panic(err)
	}
	batch := batchedserver.NewBatchSettlementEvmScheme(payTo, &batchedserver.BatchSettlementEvmSchemeServerConfig{
		WithdrawDelay: 86_400,
		ReceiverAuthorizerSigner: authorizer,
		Storage: batchedserver.NewFileChannelStorage(batchsettlement.FileChannelStorageOptions{
			Directory: "./channels",
		}),
	})
	batch.CreateChannelManager(facilitator, network).Start(batchedserver.AutoSettlementConfig{
		ClaimIntervalSecs: 60, SettleIntervalSecs: 300, RefundIntervalSecs: 3600, MaxClaimsPerBatch: 100,
	})

	// docs:start x402-exact-go
	routes := x402http.RoutesConfig{
		"GET /fixed": {
			Accepts: x402http.PaymentOptions{{Scheme: "exact", Price: "$0.01", Network: network, PayTo: payTo}},
			Description: "Fixed-price market report", MimeType: "application/json",
		},
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /fixed", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"report": "Base market summary"})
	})
	// docs:end x402-exact-go

	// docs:start x402-upto-go
	routes["GET /metered"] = x402http.RouteConfig{
		Accepts: x402http.PaymentOptions{{Scheme: "upto", Price: "$0.10", Network: network, PayTo: payTo}},
		Description: "Usage-priced inference", MimeType: "application/json",
	}
	mux.HandleFunc("GET /metered", func(w http.ResponseWriter, _ *http.Request) {
		nethttpmw.SetSettlementOverrides(w, &x402.SettlementOverrides{Amount: "40000"})
		_ = json.NewEncoder(w).Encode(map[string]any{"tokens": 812, "result": "Generated response"})
	})
	// docs:end x402-upto-go

	// docs:start x402-batch-go
	routes["GET /stream"] = x402http.RouteConfig{
		Accepts: x402http.PaymentOptions{{Scheme: batchsettlement.SchemeBatched, Price: "$0.01", Network: network, PayTo: payTo}},
		Description: "High-frequency price tick", MimeType: "application/json",
	}
	mux.HandleFunc("GET /stream", func(w http.ResponseWriter, _ *http.Request) {
		nethttpmw.SetSettlementOverrides(w, &x402.SettlementOverrides{Amount: "50%"})
		_ = json.NewEncoder(w).Encode(map[string]string{"asset": "ETH", "price": "3200.00"})
	})
	// docs:end x402-batch-go
	if asset := os.Getenv("X402_ASSET"); asset != "" {
		extra := map[string]interface{}{"name": "Merchant USD", "version": "1", "assetTransferMethod": "permit2"}
		routes["GET /fixed"].Accepts[0].Price = map[string]interface{}{"amount": "10000", "asset": asset, "extra": extra}
		routes["GET /metered"].Accepts[0].Price = map[string]interface{}{"amount": "100000", "asset": asset, "extra": extra}
		routes["GET /stream"].Accepts[0].Price = map[string]interface{}{"amount": "10000", "asset": asset, "extra": extra}
	}

	handler := nethttpmw.X402Payment(nethttpmw.Config{
		Routes: routes, Facilitator: facilitator, Timeout: 30 * time.Second,
		Schemes: []nethttpmw.SchemeConfig{
			{Network: network, Server: exactevm.NewExactEvmScheme()},
			{Network: network, Server: uptoevm.NewUptoEvmScheme()},
			{Network: network, Server: batch},
		},
	})(mux)
	fmt.Println("x402 server listening on http://localhost:4021")
	if err := http.ListenAndServe(":4021", handler); err != nil {
		panic(err)
	}
}
