import { Header } from "@/components";
import { Box, Container, Image } from "@chakra-ui/react";
import { BountyDetail, MetadataMeta } from "@strata-foundation/marketplace-ui";
import { usePublicKey, useTokenMetadata } from "@strata-foundation/react";
import {
  GetServerSideProps,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { useRouter } from "next/router";
import React from "react";
import { mintMetadataServerSideProps } from "../../../utils/mintMetadataServerSideProps";
import { route, routes } from "../../../utils/routes";

export const getServerSideProps: GetServerSideProps =
  mintMetadataServerSideProps;

export const MarketDisplay: NextPage = ({
  name,
  image,
  description,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter();
  const { mintKey: mintKeyRaw } = router.query;

  const mintKey = usePublicKey(mintKeyRaw as string);
  const { image: targetImage } = useTokenMetadata(mintKey);

  return (
    <Box
      w="full"
      backgroundColor="#f9f9f9"
      minHeight="100vh"
      paddingBottom="200px"
    >
      <Header showWallet />
      <MetadataMeta
        title={`Wumbo Bounty | ${name}`}
        description={description}
        image={image}
        url={`https://wum.bo/bounties/${mintKey}/`}
      />
      <Box padding="54px" backgroundColor="black.500" />
      <Container justify="stretch" maxW="640px">
        <Image
          zIndex={1000}
          rounded="xl"
          background="#f9f9f9"
          outline="3.15556px solid #E1E3E8"
          mb="-22px"
          mt="-60px"
          marginLeft="auto"
          marginRight="auto"
          w="142px"
          h="142px"
          alt={name}
          src={targetImage || image}
        />
        <Box zIndex={1} bg="white" shadow="xl" rounded="lg" p={2}>
          <BountyDetail
            onEdit={() =>
              router.push(
                route(routes.editBounty, {
                  mintKey: mintKey?.toBase58(),
                })
              )
            }
            name={name}
            description={description}
            image={image}
            mintKey={mintKey}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default MarketDisplay;
