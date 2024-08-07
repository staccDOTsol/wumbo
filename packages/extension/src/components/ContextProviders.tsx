import React, { FC, useCallback, useMemo } from "react";
import {
  WALLET_PROVIDERS,
  Notification,
  wumboApi,
  ThemeProvider,
  INJECTED_PROVIDERS,
  SOLANA_API_URL,
  ConfigProvider,
  GET_TOKEN_ENDPOINT,
} from "wumbo-common";
import {
  AccountProvider,
  SolPriceProvider,
  ErrorHandlerProvider,
  StrataSdksProvider,
} from "@strata-foundation/react";
import { ApolloProvider } from "@apollo/client";
import { DrawerProvider } from "@/contexts/drawerContext";
import { InjectedWalletAdapter } from "@/utils/wallets";
import toast from "react-hot-toast";
import { HistoryContextProvider } from "../utils/history";
import * as Sentry from "@sentry/react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { MarketplaceSdkProvider } from "@strata-foundation/marketplace-ui";
import { tokenAuthFetchMiddleware } from "@strata-foundation/web3-token-auth";

export const getToken = (endpoint: string) => async () => {
  if (endpoint.includes("genesysgo")) {
    const req = await fetch(GET_TOKEN_ENDPOINT!);
    const { access_token }: { access_token: string } = await req.json();
    return access_token;
  }

  return "";
};

export const ContextProviders: FC = ({ children }) => {
  const alteredWallets = useMemo(
    () =>
      WALLET_PROVIDERS.map((adapter) => {
        const injectedWalletNames = INJECTED_PROVIDERS.map((a) => a.name);
        if (injectedWalletNames.includes(adapter.name)) {
          return new InjectedWalletAdapter({
            name: adapter.name,
            url: adapter.url,
            icon: adapter.icon,
          });
        }

        return adapter;
      }),
    []
  );

  const onError = useCallback(
    (error: Error) => {
      console.error(error);
      Sentry.captureException(error);
      if (
        error.message?.includes(
          "Attempt to debit an account but found no record of a prior credit."
        )
      ) {
        error = new Error("Not enough SOL to perform this action");
      }

      const code = (error.message?.match("custom program error: (.*)") ||
        [])[1];
      if (code == "0x1") {
        error = new Error("Insufficient balance.");
      } else if (code == "0x136") {
        error = new Error("Purchased more than the cap of 100 bWUM");
      } else if (code === "0x0") {
        error = new Error("Blockhash expired. Please retry");
      }

      toast.custom((t) => (
        <Notification
          type="error"
          show={t.visible}
          heading={error.name}
          // @ts-ignore
          message={error.message || error.msg || error.toString()}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ));
    },
    [toast]
  );

  return (
    <ConfigProvider>
      <ConnectionProvider
        endpoint={SOLANA_API_URL}
        config={{
          commitment: "confirmed",
          fetchMiddleware: tokenAuthFetchMiddleware({
            getToken: getToken(SOLANA_API_URL),
          }),
        }}
      >
        <ErrorHandlerProvider onError={onError}>
          <ApolloProvider client={wumboApi}>
            <AccountProvider commitment="confirmed">
              <WalletProvider wallets={alteredWallets} onError={console.error}>
                <StrataSdksProvider>
                  <SolPriceProvider>
                    <HistoryContextProvider>
                      <DrawerProvider>
                        <MarketplaceSdkProvider>
                          <ThemeProvider>{children}</ThemeProvider>
                        </MarketplaceSdkProvider>
                      </DrawerProvider>
                    </HistoryContextProvider>
                  </SolPriceProvider>
                </StrataSdksProvider>
              </WalletProvider>
            </AccountProvider>
          </ApolloProvider>
        </ErrorHandlerProvider>
      </ConnectionProvider>
    </ConfigProvider>
  );
};
