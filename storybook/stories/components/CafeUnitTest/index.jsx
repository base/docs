/* eslint-disable */

import React from "react";
import { useEffect, useState, Suspense } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, base, baseSepolia, baseGoerli } from "wagmi/chains";
import { coinbaseWallet, metaMask, injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import {
  ConnectWallet,
  ConnectWalletText,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
  WalletDefault,
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

const containerStyle = {
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  maxWidth: "800px",
  margin: "0 auto",
  padding: "32px",
  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  borderRadius: "20px",
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  minHeight: "600px",
};

const cardStyle = {
  background: "rgba(255, 255, 255, 0.9)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "24px",
  boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
};

const titleStyle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#2d3748",
  marginBottom: "24px",
  textAlign: "center",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const walletSectionStyle = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "4px",
  boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  textAlign: "center",
};

// Create a query client for tanstack query (required by wagmi v2)
const queryClient = new QueryClient();

// Define the SANDBOX_CHAIN (matching App.tsx)
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

// Define your wagmi config
const wagmiConfig = createConfig({
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
});

export function CafeUnitTest({ nftNum }) {
  const { isConnecting, isDisconnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const [messages, setMessages] = useState(["Submit your contract address."]);
  const [contractFormEntry, setContractFormEntry] = useState("");
  const [submittedContract, setSubmittedContract] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [fetchNFTStatus, setFetchNFTStatus] = useState(true);
  const [testingState, setTestingState] = useState("idle"); // 'idle', 'testing', 'waiting', 'completed', 'error'

  const nftData = useNFTData();

  const nft = nftData[nftNum];

  const { data: hasNFT, error: nftError } = useReadContract({
    address: nft.deployment.address,
    abi: nft.deployment.abi,
    functionName: "owners",
    args: [address],
    enabled: fetchNFTStatus,
    onSettled(data, error) {
      if (error) {
        console.error("Error checking NFT ownership:", error);
        setMessages(["Error checking NFT ownership status.", "Please check your connection and try again."]);
      } else {
        setHasPin(!!data);
      }
      setFetchNFTStatus(false);
    },
  });

  // Test Contract Function
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

  useEffect(() => {
    if (hasNFT != null) {
      setHasPin(hasNFT);
    }
  }, [hasNFT]);

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

  // Update manual state based on wagmi states
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

  useEffect(() => {
    if (transactionReceipt) {
      setTestingState("completed");
      console.log("Transaction receipt received:", transactionReceipt);
    }
  }, [transactionReceipt]);

  // Reset everything when chain or address changes
  useEffect(() => {
    console.log("Connected to chain:", chain?.id, chain?.name);
    // Reset all state when chain or address changes
    setTestingState("idle");
    if (!submittedContract) {
      setMessages(["Submit your contract address."]);
    }
  }, [chain, address, submittedContract]);

  useEffect(() => {
    async function processEventLog(parsedLog) {
      const processed = [];
      if (parsedLog.eventName === "TestSuiteResult") {
        const { testResults } = parsedLog.args;
        // Results don't know which tests failed, so find them
        for (const testResult of testResults) {
          processed.push(`✅ ${testResult.message}`);
          const { assertResults } = testResult;
          const { elements: arList, num } = assertResults;
          // Slice out unused in array - arList is a dynamic memory array implementation
          // so it may have unused elements allocated
          const elements = arList.slice(0, Number(num));
          let passedAllAsserts = true;
          for (const element of elements) {
            if (!element.passed) {
              passedAllAsserts = false;
            }
          }
          if (!passedAllAsserts) {
            processed[processed.length - 1] = `❌${processed[processed.length - 1].slice(1)}`;
            for (const element of elements) {
              if (element.passed === false) {
                try {
                  processed.push(`-> ${element.assertionError}`);
                } catch {
                  // An error in the assert smart contract sometimes sends strings
                  // with bytes that can't be converted to utf-8
                  // It can't be fixed here because the error is caused within iface.parseLog(log)
                  // See: https://github.com/ethers-io/ethers.js/issues/714

                  processed.push("-> Assertion failed (cannot parse message)");
                }
              }
            }
          }
        }
      }

      setMessages([...processed]);
      setTestingState("completed");
    }

    if (transactionReceipt) {
      for (const log of transactionReceipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: nft.deployment.abi,
            data: log.data,
            topics: log.topics,
          });
          console.log("topics", parsed);
          processEventLog(parsed);
        } catch (e) {
          // Skip other log types (can't tell type without parsing)
          console.log("SKIPPED LOG", e);
        }
      }
    }
  }, [transactionReceipt, contractFormEntry, nft.deployment.abi]);

  async function handleContractSubmit(event) {
    event.preventDefault();

    // Clear any previous submission state
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

      // Set a timeout in case transaction hangs
      const timeoutId = setTimeout(() => {
        if (testingState === "waiting" || testingState === "testing") {
          console.log("Transaction taking too long, resetting state");
          setMessages([...messages, "Transaction taking too long. Please try again."]);
          setTestingState("idle");
        }
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Error submitting contract:", error);
      setMessages(["Error submitting contract for testing.", "Please check your connection and try again."]);
      setTestingState("error");
    }
  }

  // Handle the manual reset button action
  function handleManualReset() {
    console.log("Manual reset triggered");
    // Reset the testing state
    setTestingState("idle");
    setMessages(["Submit your contract address."]);

    // Also try the wagmi resets
    if (resetTestContract) resetTestContract();
    if (resetTransactionReceipt) resetTransactionReceipt();

    // Force clear localStorage related to the current state
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

        // Apply appropriate style based on testing state
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
          <div style={{
            marginTop: "12px",
            color: "#4a5568",
            fontSize: "16px",
            fontWeight: "500",
            textAlign: "center"
          }}>
            Please connect your wallet to continue
          </div>
        </div>
      );
    }
          if (isConnecting) {
        return (
          <div style={{
            color: "#4a5568",
            fontSize: "16px",
            fontWeight: "500",
            textAlign: "center",
            padding: "20px"
          }}>
            Connecting...
          </div>
        );
      }
    if (chain?.id !== baseSepolia.id) {
              return (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div style={{
              color: "#e53e3e",
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px"
            }}>
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
              <div style={{
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
          padding: "24px",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          color: "#1a202c",
        }}>
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

        <div style={{ marginTop: "6px" }}>
          {renderTests()}
        </div>
        
        <div style={{ marginTop: "6px" }}>
          {renderResult()}
        </div>
        
        <form style={{ marginTop: "1px" }}>
          <input
            placeholder="Enter contract address (0x...)"
            style={{
              ...inputStyle,
              marginBottom: "6px",
              color: "#1a202c",
              fontWeight: "500",
            }}
            type="text"
            id="submissionAddressField"
            value={contractFormEntry}
            onChange={handleContractChange}
            onFocus={(e) => {
              e.target.style.borderColor = "#667eea";
              e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)";
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
              type="button"
              onClick={handleContractSubmit}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  Object.assign(e.target.style, buttonEnabledColor);
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(0, 81, 255, 0.3)";
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

// Create a wrapper component that provides the necessary context
function CafeUnitTestWithProviders(props) {
  // Use client-side only rendering to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  // Create stable instances of query client and config
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

  // This prevents hydration errors by only rendering client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a loading state on the server
  if (!mounted) {
    return <div>Loading wallet connection...</div>;
  }

  // Get API keys from environment variables
  const viteCdpApiKey = "15d5754b-9cab-406a-8720-42c7341f5945";
  const viteProjectId = "81eac42f-0b13-48e3-a6bb-9dd44a958a1e";

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
            schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
            config={{
              appearance: {
                mode: "auto",
                theme: "default",
              },
              wallet: {
                display: 'modal',
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

// Simple error boundary component to catch and display errors
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

// Export the wrapped component instead
export default CafeUnitTestWithProviders;
