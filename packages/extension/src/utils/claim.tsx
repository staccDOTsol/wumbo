import { routes } from "@/constants/routes";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAsyncCallback } from "react-async-hook";
import { useHistory } from "react-router-dom";
import { executeRemoteTxn } from "@strata-foundation/spl-utils";
import {
  IClaimFlowOutput,
  useClaimLink,
  useCreateOrClaimCoin,
  useReverseTwitter,
  WUMBO_IDENTITY_SERVICE_URL,
} from "wumbo-common";
import { useProvider } from "@strata-foundation/react";

let claimWindow: Window | undefined;

export function useClaimFlow(name?: string | null): IClaimFlowOutput {
  const history = useHistory();
  const { claim, redirectUri } = useClaimLink({
    handle: `${name}`,
    newTab: true,
    step: 2,
  });
  const { provider } = useProvider();
  const { publicKey, wallet } = useWallet();
  const adapter = wallet?.adapter;
  const { handle: ownerTwitterHandle, error: reverseTwitterError } =
    useReverseTwitter(publicKey || undefined);
  const {
    create,
    error: createCoinError,
    creating,
    awaitingApproval: createAwaitingApproval,
  } = useCreateOrClaimCoin();

  async function oauthFlow() {
    return new Promise<any>((resolve, reject) => {
      claimWindow = claim() || undefined;
      const fn = (msg: any, _: any, sendResponse: any) => {
        if (msg.type == "CLAIM") {
          claimWindow?.close();
          resolve(msg.data);
          chrome.runtime.onMessage.removeListener(fn);
        }

        sendResponse();
      };
      chrome.runtime.onMessage.addListener(fn);
    });
  }

  async function createTwitter() {
    const oauthResult = await oauthFlow();
    await create({
      redirectUri,
      ...oauthResult,
      twitterHandle: name,
    });
  }

  const smartClaim = async () => {
    if (!ownerTwitterHandle) {
      await createTwitter();
    } else {
      name && (await create({ twitterHandle: name }));
    }
    history.push(routes.editProfile.path);
  };

  const link = async () => {
    const oauthResult = await oauthFlow();
    await executeRemoteTxn(
      provider!,
      WUMBO_IDENTITY_SERVICE_URL + "/twitter/oauth",
      {
        pubkey: adapter!.publicKey!.toBase58(),
        redirectUri,
        ...oauthResult,
        twitterHandle: name,
      }
    );
    history.push(routes.profile.path);
  };

  const { loading, execute, error } = useAsyncCallback(smartClaim);
  const {
    loading: linkLoading,
    execute: linkExec,
    error: linkError,
  } = useAsyncCallback(link);

  return {
    claim: execute,
    link: linkExec,
    claimLoading: creating || loading,
    linkLoading: linkLoading,
    error: error || createCoinError || reverseTwitterError || linkError,
  };
}
