import { Provider } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { GetServerSideProps } from "next";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { DEFAULT_ENDPOINT } from "@/constants";
import { SplTokenMetadata } from "@strata-foundation/spl-utils";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { tokenAuthFetchMiddleware } from "@strata-foundation/web3-token-auth";
import { getToken } from "@/utils";

export const mintMetadataServerSideProps: GetServerSideProps = async (
  context
) => {
  const connection = new Connection(DEFAULT_ENDPOINT, {
    commitment: "confirmed",
    fetchMiddleware: tokenAuthFetchMiddleware({
      getToken,
    }),
  });
  const provider = new Provider(
    connection,
    new NodeWallet(Keypair.generate()),
    {}
  );
  const mint = new PublicKey(context.params?.mintKey as string);
  const tokenMetadataSdk = await SplTokenMetadata.init(provider);
  const metadataAcc = await tokenMetadataSdk.getMetadata(
    await Metadata.getPDA(mint)
  );
  let metadata = null;
  try {
    metadata = await SplTokenMetadata.getArweaveMetadata(metadataAcc?.data.uri);
  } catch (e: any) {
    console.error(e);
  }

  const name =
    metadataAcc?.data?.name.length == 32
      ? metadata?.name
      : metadataAcc?.data?.name;

  return {
    props: {
      name: name || null,
      description: metadata?.description || null,
      image: (await SplTokenMetadata.getImage(metadataAcc?.data.uri)) || null,
    },
  };
};
