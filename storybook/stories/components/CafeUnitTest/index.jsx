/* eslint-disable */

import React, { useEffect, useState } from "react";
import {
  useAccount,
  useSwitchChain,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  WagmiProvider,
  createConfig,
  http,
} from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, metaMask, injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Address, Avatar, Name, Identity, EthBalance } from "@coinbase/onchainkit/identity";
import { color } from "@coinbase/onchainkit/theme";
import useNFTData from "./nft-exercise-data";
import { decodeEventLog, defineChain } from "viem";

const pinStyle = {
  width: 300,
  height: 300,
  marginRight: 10,
  marginBottom: "25px",
  display: "block",
};

const pinTitleStyle = {
  marginTop: "25px",
  marginBottom: "10px",
  fontStyle: "italic",
};

const buttonStyle = {
  fontSize: "16px",
  lineHeight: "1.75rem",
  paddingTop: "10px",
  paddingBottom: "10px",
  paddingLeft: "24px",
  paddingRight: "24px",
  color: "#fff",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

const buttonEnabledColor = {
  backgroundColor: "#0051ff",
};

const buttonDisabledColor = {
  backgroundColor: "#d1d1d1",
};

const inputStyle = {
  padding: "16px 20px",
  borderRadius: "12px",
  border: "2px solid #e2e8f0",
  fontSize: "14px",
  marginRight: "12px",
  width: "70%",
};

const messageStyle = {
  background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  color: "white",
  border: "none",
  padding: "16px 24px",
  borderRadius: "12px",
  marginBottom: "12px",
  fontWeight: "500",
  fontSize: "14px",
  boxShadow: "0 4px 15px rgba(79, 172, 254, 0.2)",
  backdropFilter: "blur(10px)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const errorMessageStyle = {
  backgroundColor: "#f8d7da",
  color: "#721c24",
  border: "1px solid #f5c6cb",
  padding: "10px 5px 10px 20px",
  borderRadius: "6px",
  marginBottom: "5px",
  fontWeight: "500",
  fontSize: "14px",
  boxShadow: "0 4px 15px rgba(255, 107, 107, 0.2)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const loadingMessageStyle = {
  backgroundColor: "#fff3cd",
  color: "#856404",
  border: "1px solid #ffeeba",
  padding: "10px 5px 10px 20px",
  borderRadius: "6px",
  marginBottom: "5px",
  fontWeight: "500",
};

const directionsStyle = {
  padding: "20px 0",
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#2d3748",
  fontWeight: "500",
};

// Кастомная сеть
export const SANDBOX_CHAIN = defineChain({
  id: 8453200058,
  name: "Sandbox Network",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sandbox-rpc-testnet.appchain.base.org"],
    },
  },
});

export function CafeUnitTest({ nftNum }) {
  const { isConnecting, isDisconnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const [messages, setMessages] = useState(["Submit your contract address."]);
  const [contractFormEntry, setContractFormEntry] = useState("");
  const [submittedContract, setSubmittedContract] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [testingState, setTestingState] = useState("idle"); // 'idle', 'testing', 'waiting', 'completed', 'error'

  const nftData = useNFTData();
  const nft = nftData[nftNum];

  const {
    data: hasNFT,
    error: nftError,
    refetch: refetchNFT,
  } = useReadContract({
    address: nft.deployment.address,
    abi: nft.deployment.abi,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  const {
    writeContract: testContract,
    isPending: isTestLoading,
    error: isTestError,
    data: transactionHash,
    reset: resetTestContract,
  } = useWriteContract();

  const {
    data: transactionReceipt,
    isPending: isTestReceiptLoading,
    reset: resetTransactionReceipt,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    enabled: !!transactionHash,
  });

  function handleContractChange(event) {
    setContractFormEntry(event.target.value);
  }

  // NFT ownership / errors
  useEffect(() => {
    if (nftError) {
      console.error("Error checking NFT ownership:", nftError);
      setMessages(["Error checking NFT ownership status.", "Please check your connection and try again."]);
      setHasPin(false);
    } else if (hasNFT !== undefined) {
      setHasPin(Number(hasNFT) > 0);
    }
  }, [hasNFT, nftError, address]);

  // Ошибка при тестировании
  useEffect(() => {
    if (isTestError) {
      setMessages([
        "Something is wrong with the contract at the address you are trying to submit",
        "It is likely that your function signatures do not match what is expected.",
        "You will also see this if you cancel the transaction.",
      ]);
      setTestingState("error");
    }
  }, [isTestError]);

  // wagmi state → наш state
  useEffect(() => {
    if (isTestLoading) {
      setTestingState("testing");
    }
  }, [isTestLoading]);

  useEffect(() => {
    if (isTestReceiptLoading && transactionHash) {
      setTestingState("waiting");
    }
  }, [isTestReceiptLoading, transactionHash]);

  // receipt → completed + refetch NFT
  useEffect(() => {
    if (transactionReceipt) {
      setTestingState("completed");
      console.log("Transaction receipt received:", transactionReceipt);
      if (address) {
        refetchNFT();
      }
    }
  }, [transactionReceipt, address, refetchNFT]);

  // Timeout на зависшую транзакцию (с защитой от unmount)
  useEffect(() => {
    if (!transactionHash) return;

    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (!isMounted) return;

      setTestingState((state) => {
        if (state === "waiting" || state === "testing") {
          setMessages((prev) => [...prev, "Transaction taking too long. Please try again."]);
          return "idle";
        }
        return state;
      });
    }, 30000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [transactionHash]);

  // Reset при смене сети / адреса
  useEffect(() => {
    console.log("Connected to chain:", chain?.id, chain?.name);
    setTestingState("idle");
    if (!submittedContract) {
      setMessages(["Submit your contract address."]);
    }
    setHasPin(false);
  }, [chain, address, submittedContract]);

  // Парсинг событий TestSuiteResult (агрегация логов + защита от unmount + null-safe)
  useEffect(() => {
    let isMounted = true;

    if (transactionReceipt) {
      const allProcessed = [];

      for (const log of transactionReceipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: nft.deployment.abi,
            data: log.data,
            topics: log.topics,
          });

          if (parsed.eventName === "TestSuiteResult") {
            const args = parsed.args || {};
            const testResults = args.testResults;

            if (testResults && Array.isArray(testResults)) {
              for (const testResult of testResults) {
                if (!testResult || typeof testResult !== "object") continue;

                const message = testResult.message || "Unknown test";
                allProcessed.push(`✅ ${message}`);

                const assertResults = testResult.assertResults || {};
                const arList = Array.isArray(assertResults.elements) ? assertResults.elements : [];
                const num = Number(assertResults.num || arList.length);
                const elements = arList.slice(0, num);

                let passedAllAsserts = true;
                for (const element of elements) {
                  if (element && element.passed === false) {
                    passedAllAsserts = false;
                  }
                }

                if (!passedAllAsserts) {
                  const lastIndex = allProcessed.length - 1;
                  if (lastIndex >= 0) {
                    allProcessed[lastIndex] = `❌${allProcessed[lastIndex].slice(1)}`;
                  }

                  for (const element of elements) {
                    if (element && element.passed === false) {
                      try {
                        const errMsg = element.assertionError || "Unknown error";
                        allProcessed.push(`-> ${errMsg}`);
                      } catch {
                        allProcessed.push("-> Assertion failed (cannot parse message)");
                      }
                    }
                  }
                }
              }
            } else if (allProcessed.length === 0) {
              allProcessed.push("⚠️ No valid test results found.");
            }
          }
        } catch (e) {
          console.log("SKIPPED LOG", e);
        }
      }

      if (isMounted && allProcessed.length > 0) {
        setMessages(allProcessed);
        setTestingState("completed");
      }
    }

    return () => {
      isMounted = false;
    };
  }, [transactionReceipt, nft.deployment.abi]);

  async function handleContractSubmit(event) {
    event.preventDefault();

    setTestingState("testing");
    setSubmittedContract(contractFormEntry);
    setMessages(["Running tests..."]);

    try {
      await testContract({
        address: nft.deployment.address,
        abi: nft.deployment.abi,
        functionName: "testContract",
        args: [contractFormEntry],
      });
    } catch (error) {
      console.error("Error submitting contract:", error);
      setMessages(["Error submitting contract for testing.", "Please check your connection and try again."]);
      setTestingState("error");
    }
  }

  // Ручной reset (пока не привязан к UI)
  function handleManualReset() {
    console.log("Manual reset triggered");
    setTestingState("idle");
    setMessages(["Submit your contract address."]);

    if (resetTestContract) resetTestContract();
    if (resetTransactionReceipt) resetTransactionReceipt();

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.includes("wagmi") || key.includes("transaction")) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.log("Error clearing localStorage:", e);
    }
  }

  function renderTests() {
    if (submittedContract) {
      const listItems = messages.map((message, index) => {
        let style = messageStyle;

        if (testingState === "error") {
          style = errorMessageStyle;
        } else if (testingState === "testing" || testingState === "waiting") {
          style = loadingMessageStyle;
        }

        return (
          <div className="alert-message" style={style} key={index}>
            {message}
          </div>
        );
      });
      return <div>{listItems}</div>;
    }
    return <div />;
  }

  function renderResult() {
    if (hasPin) {
      return (
        <div>
          <div style={pinTitleStyle}>
            {nft.title} NFT Badge Earned on {chain?.name}!
          </div>
          <img src={nft.img} style={pinStyle} alt={`${nft.title} NFT Badge`} />
        </div>
      );
    }
    return <div style={directionsStyle}>Submit your passing contract to earn this badge.</div>;
  }

  function renderTestSubmission() {
    if (isDisconnected) {
      return (
        <div>
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
          </Wallet>
          <div
            style={{
              marginTop: "12px",
              color: "#4a5568",
              fontSize: "16px",
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            Please connect your wallet to continue
          </div>
        </div>
      );
    }

    if (isConnecting) {
      return (
        <div
          style={{
            color: "#4a5568",
            fontSize: "16px",
            fontWeight: "500",
            textAlign: "center",
            padding: "20px",
          }}
        >
          Connecting...
        </div>
      );
    }

    if (chain?.id !== baseSepolia.id) {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div
            style={{
              color: "#e53e3e",
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            ⚠️ You are not connected to Base Sepolia
          </div>
          <button
            style={{
              ...buttonStyle,
              ...buttonEnabledColor,
              marginTop: "10px",
            }}
            onClick={() => switchChain({ chainId: baseSepolia.id })}
          >
            Switch to Base Sepolia
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
          padding: "24px",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          color: "#1a202c",
        }}
      >
        <div className="relative" style={{ marginBottom: "24px" }}>
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown className="absolute right-0 z-[9999] rounded-xl bg-white font-sans shadow-md">
              <Identity className="px-4 pb-2 pt-3" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address className={color.foregroundMuted} />
                <EthBalance />
              </Identity>
              <WalletDropdownBasename />
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>

        <div style={{ marginTop: "6px" }}>{renderTests()}</div>

        <div style={{ marginTop: "6px" }}>{renderResult()}</div>

        <form
          style={{
            marginTop: "1px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
          onSubmit={handleContractSubmit}
        >
          <input
            placeholder="Enter contract address (0x...)"
            style={{
              ...inputStyle,
              marginBottom: 0,
              color: "#1a202c",
              fontWeight: "500",
              flex: "1",
              minWidth: "200px",
            }}
            type="text"
            id="submissionAddressField"
            value={contractFormEntry}
            onChange={handleContractChange}
            onFocus={(e) => {
              e.target.style.borderColor = "#667eea";
              e.target.style.boxShadow =
                "0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
            }}
            disabled={testingState === "testing" || testingState === "waiting"}
          />
          {testingState === "idle" || testingState === "error" || testingState === "completed" ? (
            <button
              style={{
                ...buttonStyle,
                ...buttonEnabledColor,
              }}
              type="submit"
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  Object.assign(e.currentTarget.style, buttonEnabledColor);
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 81, 255, 0.3)";
                }
              }}
            >
              Submit
            </button>
          ) : (
            <button
              style={{
                ...buttonStyle,
                ...buttonDisabledColor,
              }}
              type="button"
              disabled
            >
              {testingState === "testing" ? "🔍 Testing Contract..." : "⏳ Waiting for confirmation..."}
            </button>
          )}
        </form>
      </div>
    );
  }

  return <div>{renderTestSubmission()}</div>;
}

// Обёртка с провайдерами
function CafeUnitTestWithProviders(props) {
  const [mounted, setMounted] = useState(false);

  const queryClientRef = React.useRef(new QueryClient());
  const configRef = React.useRef(
    createConfig({
      chains: [base, baseSepolia, SANDBOX_CHAIN],
      connectors: [
        coinbaseWallet({
          appName: "OnchainKit",
        }),
        metaMask({
          dappMetadata: {
            name: "OnchainKit",
          },
        }),
        injected(),
      ],
      ssr: true,
      transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
        [SANDBOX_CHAIN.id]: http(),
      },
    })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading wallet connection...</div>;
  }

  const viteCdpApiKey = import.meta.env.VITE_CDP_API_KEY || "YOUR_CDP_API_KEY_HERE";
  const viteProjectId = import.meta.env.VITE_PROJECT_ID || "YOUR_PROJECT_ID_HERE";
  const schemaId = import.meta.env.VITE_SCHEMA_ID || "YOUR_SCHEMA_ID_HERE";

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .cafe-unit-test-container {
            animation: fadeIn 0.5s ease-out;
            color: #1a202c;
          }

          .cafe-unit-test-container input:focus {
            transform: translateY(-1px);
          }

          .cafe-unit-test-container button:hover:not(:disabled) {
            transform: translateY(-2px) !important;
          }

          .cafe-unit-test-container button:active:not(:disabled) {
            transform: translateY(0px) !important;
          }

          .cafe-unit-test-container input::placeholder {
            color: #a0aec0;
            font-weight: 400;
          }
        `}
      </style>
      <WagmiProvider config={configRef.current}>
        <QueryClientProvider client={queryClientRef.current}>
          <OnchainKitProvider
            apiKey={viteCdpApiKey}
            chain={baseSepolia}
            projectId={viteProjectId}
            schemaId={schemaId}
            config={{
              appearance: {
                mode: "auto",
                theme: "default",
              },
              wallet: {
                display: "modal",
              },
            }}
          >
            <ErrorBoundary>
              <div className="cafe-unit-test-container">
                <CafeUnitTest {...props} />
              </div>
            </ErrorBoundary>
          </OnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}

// Error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error in CafeUnitTest component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            color: "red",
            border: "1px solid red",
            borderRadius: "5px",
            margin: "10px 0",
          }}
        >
          <h3>Something went wrong</h3>
          <p>Please try refreshing the page or connecting a different wallet.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default CafeUnitTestWithProviders;
