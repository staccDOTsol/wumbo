import {
  BaseSignerWalletAdapter,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import { Transaction } from "@solana/web3.js";
import { serializeError } from "serialize-error";
import { INJECTED_PROVIDERS } from "wumbo-common";
import {
  MessageType,
  Message,
  ConnectMessage,
  SignTransactionMessage,
  SignTransactionsMessage,
} from "../../utils/wallets";

const getAdapter = (name: string): any | undefined =>
  INJECTED_PROVIDERS.find((p) => p.name === name);

let adapter: BaseSignerWalletAdapter | undefined;

const resetWallet = () =>
  window.postMessage({ type: MessageType.WALLET_RESET }, "*");

(window as Window).addEventListener(
  "message",
  async (e) => {
    if (e.data.type && e.ports) {
      const sendReply = (data: any) => {
        if (data.error) {
          data.error = serializeError(data.error);
        }
        e.ports[0].postMessage(data);
      };

      switch ((e.data as Message).type) {
        case MessageType.WALLET_CONNECT: {
          const {
            data: { name },
          } = e as MessageEvent<ConnectMessage>;
          adapter = getAdapter(name!);
          adapter?.on("disconnect", resetWallet);

          try {
            await adapter?.connect();
            sendReply({
              publicKey: adapter!.publicKey!.toBuffer(),
            });
          } catch (error) {
            sendReply({ error });
          }

          break;
        }

        case MessageType.WALLET_READY_STATE: {
          const {
            data: { name },
          } = e as MessageEvent<ConnectMessage>;
          adapter = getAdapter(name!);

          try {
            const readyState = adapter?.readyState;

            if (adapter?.readyState === WalletReadyState.NotDetected) {
              window.open(adapter?.url);
            }

            sendReply({ readyState });
          } catch (error) {
            sendReply({ error });
          }
          break;
        }

        case MessageType.SIGN_TRANSACTION: {
          const {
            data: { transaction },
          } = e as MessageEvent<SignTransactionMessage>;
          const unsigned = Transaction.from(transaction);

          try {
            const signed = await adapter?.signTransaction(unsigned);
            sendReply({
              signedTransaction: signed!.serialize({
                verifySignatures: false,
                requireAllSignatures: false,
              }),
            });
          } catch (error) {
            sendReply({ error });
          }

          break;
        }

        case MessageType.SIGN_TRANSACTIONS: {
          const {
            data: { transactions },
          } = e as MessageEvent<SignTransactionsMessage>;
          const unsigned = transactions.map(Transaction.from);

          try {
            const signed = await adapter?.signAllTransactions(unsigned);

            sendReply({
              signedTransactions: signed!.map((signedT) =>
                signedT.serialize({
                  verifySignatures: true,
                  requireAllSignatures: false,
                })
              ),
            });
          } catch (error) {
            sendReply({ error });
          }

          break;
        }

        case MessageType.WALLET_DISCONNECT: {
          adapter?.on("disconnect", () => sendReply(true));
          adapter?.disconnect();
          adapter = undefined;
          break;
        }
      }
    }
  },
  false
);
